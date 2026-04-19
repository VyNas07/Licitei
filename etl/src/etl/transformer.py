"""Módulo de transformação e normalização dos dados brutos do PNCP."""

from datetime import datetime

from loguru import logger


class PNCPTransformer:
    """Transforma e normaliza registros brutos da API do PNCP.

    Responsabilidades:
    - Renomear campos da API (camelCase) para snake_case
    - Normalizar tipos: strings com strip, floats, datetime
    - Aplainar campos aninhados relevantes (orgaoEntidade, unidadeOrgao)
    - Descartar registros sem chave de upsert (numeroControlePNCP)
    - Adicionar metadados de proveniência (_extraido_em, _fonte)

    A classe é stateless — nenhum estado é mantido entre chamadas.
    """

    def __init__(self) -> None:
        """Inicializa o transformer."""
        logger.info("PNCPTransformer inicializado")

    def _transformar_registro(self, registro: dict) -> dict | None:
        """Transforma um único registro bruto em documento normalizado.

        Campos obrigatórios ausentes resultam em descarte do registro (retorna None).
        Campos opcionais ausentes ou inválidos recebem valores padrão com log de aviso.

        Args:
            registro: Dicionário bruto retornado pela API do PNCP.

        Returns:
            Dicionário normalizado pronto para carga, ou None se o registro for inválido.
        """
        # --- Chave de upsert (obrigatória) ---
        numero_controle = registro.get("numeroControlePNCP")
        if not numero_controle:
            logger.warning(
                f"Registro descartado: campo 'numeroControlePNCP' ausente | "
                f"processo={registro.get('processo', 'desconhecido')}"
            )
            return None

        # --- Campos de texto ---
        objeto_compra = registro.get("objetoCompra") or "Não informado"
        objeto_compra = objeto_compra.strip()

        modalidade_nome = registro.get("modalidadeNome") or "Não informado"
        situacao_compra_nome = registro.get("situacaoCompraNome") or "Não informado"

        # --- Valor financeiro ---
        valor_raw = registro.get("valorTotalEstimado")
        try:
            valor_total_estimado = float(valor_raw) if valor_raw is not None else 0.0
        except (TypeError, ValueError):
            logger.warning(
                f"Valor inválido para '{numero_controle}': "
                f"valorTotalEstimado={valor_raw!r} → usando 0.0"
            )
            valor_total_estimado = 0.0

        # --- Datas ---
        data_abertura = self._parsear_data(
            registro.get("dataAberturaProposta"), "dataAberturaProposta", numero_controle
        )
        data_encerramento = self._parsear_data(
            registro.get("dataEncerramentoProposta"), "dataEncerramentoProposta", numero_controle
        )

        # --- Órgão (nested → flat) ---
        orgao = registro.get("orgaoEntidade") or {}
        orgao_cnpj = orgao.get("cnpj") or "Não informado"
        orgao_razao_social = orgao.get("razaoSocial") or "Não informado"

        # --- Unidade (nested → flat) ---
        unidade = registro.get("unidadeOrgao") or {}
        uf = unidade.get("ufSigla") or "Não informado"
        municipio = unidade.get("municipioNome") or "Não informado"

        return {
            "numero_controle_pncp": numero_controle,
            "objeto_compra": objeto_compra,
            "valor_total_estimado": valor_total_estimado,
            "modalidade_nome": modalidade_nome,
            "situacao_compra_nome": situacao_compra_nome,
            "data_abertura_proposta": data_abertura,
            "data_encerramento_proposta": data_encerramento,
            "orgao_cnpj": orgao_cnpj,
            "orgao_razao_social": orgao_razao_social,
            "uf": uf,
            "municipio": municipio,
            "_extraido_em": datetime.utcnow(),
            "_fonte": "PNCP",
        }

    def _parsear_data(
        self,
        valor: str | None,
        campo: str,
        numero_controle: str,
    ) -> datetime | None:
        """Converte uma string ISO 8601 em objeto datetime.

        Args:
            valor: String de data no formato ISO 8601 (ex: '2025-03-15T00:00:00').
            campo: Nome do campo (usado no log de aviso).
            numero_controle: Identificador do registro (usado no log de aviso).

        Returns:
            Objeto datetime ou None se o valor for ausente ou inválido.
        """
        if not valor:
            return None
        try:
            return datetime.fromisoformat(valor)
        except (ValueError, TypeError):
            logger.warning(
                f"Data inválida para '{numero_controle}': {campo}={valor!r} → usando None"
            )
            return None

    def transformar(self, registros: list[dict]) -> list[dict]:
        """Transforma uma lista de registros brutos em documentos normalizados.

        Registros sem 'numeroControlePNCP' são descartados.
        Os demais têm campos normalizados e metadados de proveniência adicionados.

        Args:
            registros: Lista de dicionários brutos retornados pela API do PNCP.

        Returns:
            Lista de documentos normalizados, sem os registros inválidos.
        """
        logger.info(f"Iniciando transformação de {len(registros)} registros")

        transformados = []
        descartados = 0

        for registro in registros:
            resultado = self._transformar_registro(registro)
            if resultado is None:
                descartados += 1
            else:
                transformados.append(resultado)

        logger.info(
            f"Transformação concluída | "
            f"transformados={len(transformados)} | descartados={descartados}"
        )
        return transformados
