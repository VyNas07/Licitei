"""Camada Gold — agrega KPIs e persiste nas 6 coleções do MongoDB Atlas.

Coleções:
  - kpi_por_uf          → total de editais e valor médio por UF
  - kpi_por_modalidade  → contagem e valor total por modalidade
  - kpi_prazos          → editais encerrando em 7, 15 e 30 dias
  - kpi_elegibilidade   → editais dentro do teto MEI (R$81k)
  - kpi_dashboard       → totais gerais para o painel principal
  - contratos_ativos    → contratos individuais enriquecidos (consumido pelo backend)

Cada coleção KPI usa upsert por chave composta (data_referencia + dimensão).
contratos_ativos usa upsert por numero_controle_pncp.
"""

from datetime import date, datetime, timezone
from typing import Any

from loguru import logger
from pymongo import MongoClient, UpdateOne
from pymongo.errors import PyMongoError

from src.contracts import (
    EditaisSilverContract,
    KpiDashboard,
    KpiElegibilidade,
    KpiPorModalidade,
    KpiPorUf,
    KpiPrazos,
)

_TETO_MEI = 81_000.0

_COLECAO_POR_UF = "kpi_por_uf"
_COLECAO_POR_MODALIDADE = "kpi_por_modalidade"
_COLECAO_PRAZOS = "kpi_prazos"
_COLECAO_ELEGIBILIDADE = "kpi_elegibilidade"
_COLECAO_DASHBOARD = "kpi_dashboard"
_COLECAO_CONTRATOS = "contratos_ativos"


class GoldLoader:
    """Agrega dados Silver e persiste KPIs nas 5 coleções Gold do MongoDB."""

    def __init__(self, mongo_uri: str, db_name: str) -> None:
        """Inicializa a conexão com o MongoDB Atlas.

        Args:
            mongo_uri: URI de conexão do MongoDB Atlas.
            db_name: Nome do banco de dados.
        """
        self._client = MongoClient(mongo_uri)
        self._db = self._client[db_name]
        self._garantir_indices()
        logger.info(f"GoldLoader inicializado | db={db_name}")

    def _garantir_indices(self) -> None:
        """Cria índices únicos nas coleções Gold para garantir idempotência."""
        try:
            self._db[_COLECAO_POR_UF].create_index(
                [("uf", 1), ("data_referencia", 1)], unique=True
            )
            self._db[_COLECAO_POR_MODALIDADE].create_index(
                [("modalidade", 1), ("data_referencia", 1)], unique=True
            )
            self._db[_COLECAO_PRAZOS].create_index([("data_referencia", 1)], unique=True)
            self._db[_COLECAO_ELEGIBILIDADE].create_index(
                [("data_referencia", 1)], unique=True
            )
            self._db[_COLECAO_DASHBOARD].create_index([("data_referencia", 1)], unique=True)
            self._db[_COLECAO_CONTRATOS].create_index(
                "numero_controle_pncp", unique=True, background=True
            )
        except PyMongoError as exc:
            logger.warning(f"Índices Gold já existem ou erro ao criar | {exc}")

    def carregar(self, registros: list[EditaisSilverContract]) -> dict[str, int]:
        """Agrega o batch Silver e faz upsert nas 5 coleções Gold.

        Args:
            registros: Lista de contratos Silver validados do batch atual.

        Returns:
            Dicionário com totais de operações por coleção.
        """
        if not registros:
            return {}

        data_ref = date.today()
        agora = datetime.now(tz=timezone.utc)

        totais: dict[str, int] = {}
        totais[_COLECAO_POR_UF] = self._carregar_por_uf(registros, data_ref, agora)
        totais[_COLECAO_POR_MODALIDADE] = self._carregar_por_modalidade(registros, data_ref, agora)
        totais[_COLECAO_PRAZOS] = self._carregar_prazos(registros, data_ref, agora)
        totais[_COLECAO_ELEGIBILIDADE] = self._carregar_elegibilidade(registros, data_ref, agora)
        totais[_COLECAO_DASHBOARD] = self._carregar_dashboard(registros, data_ref, agora)
        totais[_COLECAO_CONTRATOS] = self._carregar_contratos(registros)

        logger.info(
            "Gold carregado | "
            + " | ".join(f"{col}={n}" for col, n in totais.items())
        )
        return totais

    def _carregar_por_uf(
        self,
        registros: list[EditaisSilverContract],
        data_ref: date,
        agora: datetime,
    ) -> int:
        """Upsert de KPIs agrupados por UF."""
        agregado: dict[str, dict[str, Any]] = {}

        for r in registros:
            uf = r.uf or "INDEFINIDO"
            if uf not in agregado:
                agregado[uf] = {"total": 0, "soma_valor": 0.0}
            agregado[uf]["total"] += 1
            agregado[uf]["soma_valor"] += r.valor_total_estimado

        ops = []
        for uf, dados in agregado.items():
            total = dados["total"]
            soma = dados["soma_valor"]
            kpi = KpiPorUf(
                uf=uf,
                total_editais=total,
                valor_medio=soma / total if total > 0 else 0.0,
                valor_total=soma,
                data_referencia=data_ref,
                atualizado_em=agora,
            )
            ops.append(
                UpdateOne(
                    {"uf": uf, "data_referencia": kpi.data_referencia.isoformat()},
                    {"$set": kpi.model_dump(mode="json")},
                    upsert=True,
                )
            )

        if ops:
            resultado = self._db[_COLECAO_POR_UF].bulk_write(ops)
            return resultado.upserted_count + resultado.modified_count
        return 0

    def _carregar_por_modalidade(
        self,
        registros: list[EditaisSilverContract],
        data_ref: date,
        agora: datetime,
    ) -> int:
        """Upsert de KPIs agrupados por modalidade."""
        agregado: dict[str, dict[str, Any]] = {}

        for r in registros:
            mod = r.modalidade_nome or "Não informado"
            if mod not in agregado:
                agregado[mod] = {"total": 0, "soma_valor": 0.0}
            agregado[mod]["total"] += 1
            agregado[mod]["soma_valor"] += r.valor_total_estimado

        ops = []
        for mod, dados in agregado.items():
            kpi = KpiPorModalidade(
                modalidade=mod,
                total_editais=dados["total"],
                valor_total=dados["soma_valor"],
                data_referencia=data_ref,
                atualizado_em=agora,
            )
            ops.append(
                UpdateOne(
                    {"modalidade": mod, "data_referencia": kpi.data_referencia.isoformat()},
                    {"$set": kpi.model_dump(mode="json")},
                    upsert=True,
                )
            )

        if ops:
            resultado = self._db[_COLECAO_POR_MODALIDADE].bulk_write(ops)
            return resultado.upserted_count + resultado.modified_count
        return 0

    def _carregar_prazos(
        self,
        registros: list[EditaisSilverContract],
        data_ref: date,
        agora: datetime,
    ) -> int:
        """Upsert de KPI de prazos (7, 15 e 30 dias)."""
        editais_7d = sum(1 for r in registros if 0 <= r.dias_ate_encerramento <= 7)
        editais_15d = sum(1 for r in registros if 0 <= r.dias_ate_encerramento <= 15)
        editais_30d = sum(1 for r in registros if 0 <= r.dias_ate_encerramento <= 30)

        kpi = KpiPrazos(
            editais_7d=editais_7d,
            editais_15d=editais_15d,
            editais_30d=editais_30d,
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_PRAZOS].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def _carregar_elegibilidade(
        self,
        registros: list[EditaisSilverContract],
        data_ref: date,
        agora: datetime,
    ) -> int:
        """Upsert de KPI de elegibilidade MEI."""
        elegiveis = [r for r in registros if r.elegivel_mei]
        total = len(registros)
        n_elegiveis = len(elegiveis)
        soma_elegiveis = sum(r.valor_total_estimado for r in elegiveis)
        pct = (n_elegiveis / total * 100) if total > 0 else 0.0

        kpi = KpiElegibilidade(
            total_elegiveis_mei=n_elegiveis,
            valor_total_elegiveis=soma_elegiveis,
            percentual_elegivel=round(pct, 2),
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_ELEGIBILIDADE].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def _carregar_dashboard(
        self,
        registros: list[EditaisSilverContract],
        data_ref: date,
        agora: datetime,
    ) -> int:
        """Upsert do KPI consolidado para o dashboard principal."""
        total = len(registros)
        soma_valor = sum(r.valor_total_estimado for r in registros)
        ticket_medio = soma_valor / total if total > 0 else 0.0
        orgaos = len({r.orgao_cnpj for r in registros if r.orgao_cnpj})
        ativos = sum(1 for r in registros if r.ativo)

        kpi = KpiDashboard(
            total_editais=total,
            valor_agregado_total=soma_valor,
            ticket_medio=round(ticket_medio, 2),
            total_orgaos_distintos=orgaos,
            editais_ativos=ativos,
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_DASHBOARD].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def _carregar_contratos(self, registros: list[EditaisSilverContract]) -> int:
        """Upsert de contratos individuais enriquecidos para consumo do backend."""
        if not registros:
            return 0
        ops = [
            UpdateOne(
                {"numero_controle_pncp": r.numero_controle_pncp},
                {"$set": r.model_dump(mode="json")},
                upsert=True,
            )
            for r in registros
        ]
        resultado = self._db[_COLECAO_CONTRATOS].bulk_write(ops, ordered=False)
        return resultado.upserted_count + resultado.modified_count

    def agregar_do_banco(self) -> dict[str, int]:
        """Recalcula todos os KPIs a partir da coleção contratos_ativos completa.

        Deve ser chamado uma única vez ao final do pipeline, após todos os batches
        serem persistidos em contratos_ativos. Garante que os KPIs reflitam o estado
        real da coleção, e não apenas o último batch processado.

        Returns:
            Dicionário com totais de operações por coleção.
        """
        data_ref = date.today()
        agora = datetime.now(tz=timezone.utc)

        totais: dict[str, int] = {}
        totais[_COLECAO_DASHBOARD] = self._agregar_dashboard(data_ref, agora)
        totais[_COLECAO_POR_UF] = self._agregar_por_uf(data_ref, agora)
        totais[_COLECAO_POR_MODALIDADE] = self._agregar_por_modalidade(data_ref, agora)
        totais[_COLECAO_PRAZOS] = self._agregar_prazos(data_ref, agora)
        totais[_COLECAO_ELEGIBILIDADE] = self._agregar_elegibilidade(data_ref, agora)

        logger.info(
            "KPIs reagregados do banco | "
            + " | ".join(f"{col}={n}" for col, n in totais.items())
        )
        return totais

    def _agregar_dashboard(self, data_ref: date, agora: datetime) -> int:
        """Agrega totais gerais do dashboard a partir de contratos_ativos."""
        pipeline = [
            {"$group": {
                "_id": None,
                "total_editais": {"$sum": 1},
                "valor_agregado_total": {"$sum": "$valor_total_estimado"},
                "orgaos": {"$addToSet": "$orgao_cnpj"},
                "editais_ativos": {"$sum": {"$cond": ["$ativo", 1, 0]}},
            }},
            {"$project": {
                "_id": 0,
                "total_editais": 1,
                "valor_agregado_total": 1,
                "total_orgaos_distintos": {"$size": "$orgaos"},
                "editais_ativos": 1,
                "ticket_medio": {"$cond": [
                    {"$gt": ["$total_editais", 0]},
                    {"$divide": ["$valor_agregado_total", "$total_editais"]},
                    0.0,
                ]},
            }},
        ]
        result = list(self._db[_COLECAO_CONTRATOS].aggregate(pipeline))
        if not result:
            return 0
        doc = result[0]
        kpi = KpiDashboard(
            total_editais=doc["total_editais"],
            valor_agregado_total=doc["valor_agregado_total"],
            ticket_medio=round(doc["ticket_medio"], 2),
            total_orgaos_distintos=doc["total_orgaos_distintos"],
            editais_ativos=doc["editais_ativos"],
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_DASHBOARD].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def _agregar_por_uf(self, data_ref: date, agora: datetime) -> int:
        """Agrega totais por UF a partir de contratos_ativos."""
        pipeline = [
            {"$group": {
                "_id": {"$ifNull": ["$uf", "INDEFINIDO"]},
                "total_editais": {"$sum": 1},
                "valor_total": {"$sum": "$valor_total_estimado"},
            }},
        ]
        result = list(self._db[_COLECAO_CONTRATOS].aggregate(pipeline))
        if not result:
            return 0
        ops = []
        for doc in result:
            uf = doc["_id"]
            total = doc["total_editais"]
            soma = doc["valor_total"]
            kpi = KpiPorUf(
                uf=uf,
                total_editais=total,
                valor_medio=soma / total if total > 0 else 0.0,
                valor_total=soma,
                data_referencia=data_ref,
                atualizado_em=agora,
            )
            ops.append(UpdateOne(
                {"uf": uf, "data_referencia": kpi.data_referencia.isoformat()},
                {"$set": kpi.model_dump(mode="json")},
                upsert=True,
            ))
        if ops:
            resultado = self._db[_COLECAO_POR_UF].bulk_write(ops)
            return resultado.upserted_count + resultado.modified_count
        return 0

    def _agregar_por_modalidade(self, data_ref: date, agora: datetime) -> int:
        """Agrega totais por modalidade a partir de contratos_ativos."""
        pipeline = [
            {"$group": {
                "_id": {"$ifNull": ["$modalidade_nome", "Não informado"]},
                "total_editais": {"$sum": 1},
                "valor_total": {"$sum": "$valor_total_estimado"},
            }},
        ]
        result = list(self._db[_COLECAO_CONTRATOS].aggregate(pipeline))
        if not result:
            return 0
        ops = []
        for doc in result:
            mod = doc["_id"]
            kpi = KpiPorModalidade(
                modalidade=mod,
                total_editais=doc["total_editais"],
                valor_total=doc["valor_total"],
                data_referencia=data_ref,
                atualizado_em=agora,
            )
            ops.append(UpdateOne(
                {"modalidade": mod, "data_referencia": kpi.data_referencia.isoformat()},
                {"$set": kpi.model_dump(mode="json")},
                upsert=True,
            ))
        if ops:
            resultado = self._db[_COLECAO_POR_MODALIDADE].bulk_write(ops)
            return resultado.upserted_count + resultado.modified_count
        return 0

    def _agregar_prazos(self, data_ref: date, agora: datetime) -> int:
        """Agrega editais por faixa de prazo de encerramento a partir de contratos_ativos."""
        pipeline = [
            {"$group": {
                "_id": None,
                "editais_7d": {"$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$dias_ate_encerramento", 0]},
                        {"$lte": ["$dias_ate_encerramento", 7]},
                    ]}, 1, 0,
                ]}},
                "editais_15d": {"$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$dias_ate_encerramento", 0]},
                        {"$lte": ["$dias_ate_encerramento", 15]},
                    ]}, 1, 0,
                ]}},
                "editais_30d": {"$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$dias_ate_encerramento", 0]},
                        {"$lte": ["$dias_ate_encerramento", 30]},
                    ]}, 1, 0,
                ]}},
            }},
        ]
        result = list(self._db[_COLECAO_CONTRATOS].aggregate(pipeline))
        if not result:
            return 0
        doc = result[0]
        kpi = KpiPrazos(
            editais_7d=doc["editais_7d"],
            editais_15d=doc["editais_15d"],
            editais_30d=doc["editais_30d"],
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_PRAZOS].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def _agregar_elegibilidade(self, data_ref: date, agora: datetime) -> int:
        """Agrega elegibilidade MEI a partir de contratos_ativos."""
        pipeline = [
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "total_elegiveis_mei": {"$sum": {"$cond": ["$elegivel_mei", 1, 0]}},
                "valor_total_elegiveis": {"$sum": {"$cond": [
                    "$elegivel_mei", "$valor_total_estimado", 0.0,
                ]}},
            }},
            {"$project": {
                "_id": 0,
                "total": 1,
                "total_elegiveis_mei": 1,
                "valor_total_elegiveis": 1,
                "percentual_elegivel": {"$cond": [
                    {"$gt": ["$total", 0]},
                    {"$multiply": [{"$divide": ["$total_elegiveis_mei", "$total"]}, 100]},
                    0.0,
                ]},
            }},
        ]
        result = list(self._db[_COLECAO_CONTRATOS].aggregate(pipeline))
        if not result:
            return 0
        doc = result[0]
        kpi = KpiElegibilidade(
            total_elegiveis_mei=doc["total_elegiveis_mei"],
            valor_total_elegiveis=doc["valor_total_elegiveis"],
            percentual_elegivel=round(doc["percentual_elegivel"], 2),
            data_referencia=data_ref,
            atualizado_em=agora,
        )
        resultado = self._db[_COLECAO_ELEGIBILIDADE].update_one(
            {"data_referencia": kpi.data_referencia.isoformat()},
            {"$set": kpi.model_dump(mode="json")},
            upsert=True,
        )
        return 1 if resultado.upserted_id or resultado.modified_count else 0

    def fechar(self) -> None:
        """Fecha a conexão com o MongoDB."""
        self._client.close()
        logger.info("GoldLoader: conexão MongoDB fechada")
