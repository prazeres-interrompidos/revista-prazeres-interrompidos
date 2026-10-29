# Verificação do protótipo — 29 de outubro de 2026

Verificado no navegador de testes:
- Número experimental com 16 páginas.
- Capa, abertura, índice, seis pares de páginas de artigos e contracapa.
- Páginas duplas no computador e uma página numa janela de 390 × 844 px (teste responsivo em iframe, não num telefone físico).
- Animação ao avançar com setas e acesso direto pelo índice.
- Leitura ampliada, aumento da letra e regresso à revista.
- Retoma da página após recarregar.
- Arquivo mostrando a edição existente.
- Pré-visualização de um rascunho com artigo longo.
- Comparação do texto repartido: 1993 caracteres preservados integralmente.
- Abertura dos controlos de áudio num rascunho com ligação WAV de teste. Não existem episódios reais no número entregue. A reprodução sonora não foi confirmada: a sessão do navegador interrompeu o teste ao interagir com o controlo nativo.
- O ecrã completo nativo foi recusado no ambiente de teste; a alternativa que ocupa a janela de leitura foi verificada visualmente.

Verificação local:
- Sintaxe de app.js, editor.js e editions.js.
- Exportação do editor executada num ambiente DOM simulado: ficheiro JS válido, seis textos integrais preservados e arquivo mantido. O download pelo navegador de testes não foi confirmado devido a uma interrupção da sessão.
- Pacote ZIP íntegro e com todos os recursos locais e licença.

Limites:
- Testes em Chrome de ambiente remoto. Falta validação em equipamentos físicos Android/iPhone, Safari e Firefox.
- Na edição definitiva, rever títulos longos, paginação, cada capa original e as ligações áudio reais.
- As edições e imagens estão num único ficheiro, adequado ao protótipo e a um arquivo inicial; um arquivo muito extenso beneficiará da divisão de dados por edição.

## Atualização do editor — 29 de outubro de 2026

- Gravação de rascunho em IndexedDB e recuperação após recarregar: verificada no navegador.
- Publicação sem autorização: bloqueada pelo editor.
- Sete testes automatizados em tests/publishing-core.test.cjs: preservação de Unicode e parágrafos, ficheiro tratado como JSON sem execução, escrita com SHA, bloqueio de conflito, ausência de commits sem alterações, erro de autorização e bloqueio sem credencial.
- Executar os testes com: node --test tests/publishing-core.test.cjs .
- A publicação direta usa a API oficial do GitHub e exige autorização pessoal de escrita. Não foi executado um envio real a partir do editor, porque ainda não foi configurada essa autorização pelo proprietário.
- A atualização dos leitores fica sujeita ao prazo de publicação e cache do GitHub Pages.
