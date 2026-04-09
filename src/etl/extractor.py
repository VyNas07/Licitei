"""Módulo de extração de dados da API pública do PNCP."""

import time
from typing import Any

import requests
from loguru import logger


class PNCPExtractor:
    """Extrai contratações públicas da API do PNCP com paginação completa e retry automático.

    A extração utiliza uma sessão HTTP persistente para reutilizar conexões TCP
    e aplica retry com backoff exponencial em falhas transitórias (5xx, timeout).
    Erros de parâmetro (4xx) são levantados imediatamente, sem retry.

    Args:
        base_url: URL base da API de consultas do PNCP.
        tamanho_pagina: Quantidade de registros por página (máximo 50).
        timeout: Tempo máximo em segundos para aguardar resposta de cada requisição.
    """

    _MAX_TENTATIVAS = 3

    def __init__(
        self,
        base_url: str,
        tamanho_pagina: int = 50,
        timeout: int = 30,
    ) -> None:
        """Inicializa o extractor e configura a sessão HTTP."""
        self._base_url = base_url.rstrip("/")
        self._tamanho_pagina = tamanho_pagina
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "Licitei-ETL/1.0 (CESAR School ADS)"})
        logger.info(
            f"PNCPExtractor inicializado | base_url={self._base_url} "
            f"| tamanho_pagina={self._tamanho_pagina}"
        )

    def _get_pagina(
        self,
        endpoint: str,
        params: dict[str, Any],
        pagina: int,
        tentativa: int = 1,
    ) -> dict | None:
        """Realiza uma requisição GET para uma página específica da API.

        Trata HTTP 204 como condição de parada (sem mais páginas), erros 4xx como
        falhas permanentes e erros 5xx/rede com retry exponencial.

        Args:
            endpoint: Caminho do endpoint relativo à base_url (ex: '/v1/contratacoes/publicacao').
            params: Parâmetros de query string base (sem pagina/tamanhoPagina).
            pagina: Número da página a ser buscada (começa em 1).
            tentativa: Número da tentativa atual (usado no cálculo do backoff).

        Returns:
            Dicionário com a resposta JSON ou None se não houver mais páginas (HTTP 204).

        Raises:
            ValueError: Quando a API retorna 400 ou 422 (parâmetros inválidos).
            requests.HTTPError: Quando a API retorna erro persistente após todas as tentativas.
        """
        url = f"{self._base_url}{endpoint}"
        params_pagina = {
            **params,
            "pagina": pagina,
            "tamanhoPagina": self._tamanho_pagina,
        }

        try:
            response = self._session.get(url, params=params_pagina, timeout=self._timeout)
        except requests.RequestException as exc:
            return self._retry(endpoint, params, pagina, tentativa, exc)

        if response.status_code == 204:
            logger.debug(f"HTTP 204 — sem mais páginas em {endpoint} (página {pagina})")
            return None

        if response.status_code in (400, 422):
            logger.error(
                f"Erro de parâmetro {response.status_code} em {url} | "
                f"params={params_pagina} | resposta={response.text[:200]}"
            )
            raise ValueError(
                f"Parâmetros inválidos para {endpoint}: HTTP {response.status_code}"
            )

        if response.status_code == 429 or response.status_code >= 500:
            return self._retry(endpoint, params, pagina, tentativa, response.status_code)

        response.raise_for_status()
        return response.json()

    def _retry(
        self,
        endpoint: str,
        params: dict[str, Any],
        pagina: int,
        tentativa: int,
        motivo: Any,
    ) -> dict | None:
        """Executa retry com backoff exponencial.

        Args:
            endpoint: Endpoint sendo consultado.
            params: Parâmetros de query string base.
            pagina: Número da página.
            tentativa: Tentativa atual (1-indexado).
            motivo: Causa da falha (código HTTP ou exceção).

        Returns:
            Resultado da próxima tentativa.

        Raises:
            requests.HTTPError: Após esgotar todas as tentativas.
        """
        if tentativa >= self._MAX_TENTATIVAS:
            logger.critical(
                f"Falha permanente em {endpoint} página {pagina} após "
                f"{self._MAX_TENTATIVAS} tentativas | motivo={motivo}"
            )
            raise requests.HTTPError(
                f"Esgotadas {self._MAX_TENTATIVAS} tentativas para {endpoint}"
            )

        espera = 2 ** tentativa
        logger.warning(
            f"Tentativa {tentativa}/{self._MAX_TENTATIVAS} falhou em {endpoint} "
            f"página {pagina} | motivo={motivo} | aguardando {espera}s..."
        )
        time.sleep(espera)
        return self._get_pagina(endpoint, params, pagina, tentativa + 1)

    def _extrair_endpoint(
        self,
        endpoint: str,
        params: dict[str, Any],
        descricao: str,
    ) -> list[dict]:
        """Loop de paginação genérico para qualquer endpoint do PNCP.

        Args:
            endpoint: Caminho do endpoint (ex: '/v1/contratacoes/publicacao').
            params: Parâmetros base da requisição (sem pagina/tamanhoPagina).
            descricao: Rótulo descritivo usado nos logs (ex: 'publicações').

        Returns:
            Lista com todos os registros extraídos de todas as páginas.
        """
        registros: list[dict] = []
        pagina = 1
        total_paginas: int | None = None

        logger.info(f"Iniciando extração de {descricao} | params={params}")

        while True:
            resultado = self._get_pagina(endpoint, params, pagina)

            if resultado is None:
                break

            if total_paginas is None:
                total_paginas = resultado.get("totalPaginas", 1)

            itens = resultado.get("data", [])
            registros.extend(itens)

            logger.info(
                f"Página {pagina}/{total_paginas} extraída "
                f"| {len(itens)} itens | {len(registros)} acumulados"
            )

            if resultado.get("paginasRestantes", 0) == 0:
                break

            # Proteção contra loop infinito
            if total_paginas is not None and pagina >= total_paginas:
                break

            pagina += 1

        logger.info(f"Extração de {descricao} concluída | total={len(registros)} registros")
        return registros

    def extrair_publicacoes(
        self,
        codigo_modalidade: int,
        data_inicial: str,
        data_final: str,
        uf: str | None = None,
    ) -> list[dict]:
        """Extrai contratações por data de publicação no PNCP.

        Args:
            codigo_modalidade: Código da modalidade de contratação (obrigatório pela API).
                Ex: 8 = Dispensa de Licitação.
            data_inicial: Data de início da consulta no formato YYYYMMDD.
            data_final: Data de fim da consulta no formato YYYYMMDD.
            uf: Sigla do estado para filtrar (ex: 'PE'). None retorna todos os estados.

        Returns:
            Lista de dicionários com os dados brutos de cada contratação.
        """
        params: dict[str, Any] = {
            "codigoModalidadeContratacao": codigo_modalidade,
            "dataInicial": data_inicial,
            "dataFinal": data_final,
        }
        if uf:
            params["uf"] = uf

        return self._extrair_endpoint(
            "/v1/contratacoes/publicacao",
            params,
            f"publicações ({data_inicial}–{data_final}, modalidade={codigo_modalidade})",
        )

    def extrair_propostas(
        self,
        data_final: str,
        uf: str | None = None,
    ) -> list[dict]:
        """Extrai contratações com recebimento de propostas em aberto.

        Retorna licitações ativas onde o prazo de envio de propostas ainda não encerrou.
        A data_final deve ser maior ou igual à data atual (validação feita no pipeline).

        Args:
            data_final: Data limite de encerramento das propostas (formato YYYYMMDD).
                Deve ser >= data atual para evitar erro 422 da API.
            uf: Sigla do estado para filtrar (ex: 'PE'). None retorna todos os estados.

        Returns:
            Lista de dicionários com os dados brutos de cada licitação aberta.
        """
        params: dict[str, Any] = {"dataFinal": data_final}
        if uf:
            params["uf"] = uf

        return self._extrair_endpoint(
            "/v1/contratacoes/proposta",
            params,
            f"propostas abertas (dataFinal={data_final})",
        )
