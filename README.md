# Revista literária Prazeres Interrompidos

Protótipo funcional, edição experimental n.º 00, Outubro de 2026. Todos os artigos são demonstrativos. Não contém capas de livros, episódios ou vozes reais. A identidade editorial inicial usa tons de vinho, papel e dourado e pode ser afinada com o logótipo e as cores oficiais.

## Abrir e ler

Abra index.html no navegador após extrair o ZIP. Não é necessário instalar software nem descarregar ficheiros para ler a versão alojada online. Todos os recursos do leitor, incluindo a biblioteca de animação, estão no pacote; não usa CDN, fontes externas, analítica, subscrições ou marcas de água.

No computador: capa isolada e páginas duplas. Em larguras pequenas: página individual. Use setas, os cantos da página, teclado (setas esquerda/direita) ou deslize. Índice permite acesso direto. O campo Página aceita um número. A+ abre a leitura ampliada com tamanho de letra ajustável e texto integral de cada artigo. Esc fecha as janelas.

A página lida fica guardada neste navegador, por edição, quando o armazenamento local está disponível. A ligação também inclui edição e página; copie-a para partilhar esse ponto de leitura. Não existe sincronização entre dispositivos. Em páginas duplas, o indicador mostra a primeira página do par visível.

Ecrã completo usa a função do navegador quando permitida. Quando indisponível, ativa uma vista de leitura que ocupa a janela. Em alguns navegadores móveis e em incorporações, o ecrã completo nativo depende das permissões do navegador.

## Preparar uma edição mensal

1. Abra editor.html (ou «Preparar uma edição» no rodapé).
2. Selecione «Criar nova edição mensal». As edições existentes ficam preservadas.
3. Preencha identificador único (ex.: 2026-11), número, mês/ano, chamada de capa e abertura. Pode selecionar uma imagem própria para a capa da revista; é mostrada inteira na área central da capa editorial.
4. Desmarque «Edição experimental» apenas quando os materiais forem definitivos.
5. Em cada artigo, preencha título, autor, editora, voz e rubrica; copie o texto original completo. O editor não reescreve, corrige nem resume os textos. Carregue a capa original PNG/JPEG/WebP. As proporções são preservadas, sem corte nem filtros. O limite por imagem é 8 MB; imagens mais leves tornam a publicação mais rápida.
6. Se existir, introduza a ligação pública do episódio. Ligações diretas MP3/OGG/WAV/M4A disponibilizam leitor áudio; páginas de plataformas abrem o episódio numa nova aba. Algumas plataformas podem impedir a reprodução direta. Não há reprodução automática. Para garantir autonomia de alojamento, podem usar-se MP3 na pasta assets do repositório e uma ligação HTTPS pública do GitHub Pages. Não coloque áudios privados ou dependentes de autenticação.
7. Pode acrescentar, remover e ordenar os artigos. A quantidade de páginas aumenta automaticamente com os textos. As palavras e os parágrafos são mantidos, mesmo quando atravessam páginas. O índice adapta-se ao número de artigos. Faça a revisão visual de cada edição, sobretudo com títulos longos e imagens próprias.
8. Escolha «Pré-visualizar revista». O rascunho abre noutra aba e não altera a revista publicada. Este passo precisa de espaço temporário no navegador; se falhar com muitas imagens, use imagens mais leves ou exporte para testar na pasta local.
9. «Guardar cópia JSON» cria uma cópia editável. Guarde-a sempre antes de fechar: o formulário não é guardado automaticamente. Pode recuperar essa cópia em «Importar cópia JSON».
10. «Exportar edições para publicar» gera editions.js com TODAS as edições carregadas. Substitua o ficheiro editions.js existente por esse ficheiro. Não apague edições antigas para conservar o arquivo. O editor não faz publicações automáticas nem necessita de credenciais.

O arquivo mostra apenas edições efetivamente presentes em editions.js. Neste protótipo existe um único número; não foram inventadas edições anteriores. O editor é uma ferramenta local, não um backoffice com autenticação. Quem visita pode criar um rascunho próprio, mas só quem tem acesso ao repositório pode mudar a publicação.

## Publicar no GitHub Pages

Use um NOVO repositório dedicado. Não é necessário alterar os repositórios atuais.

1. Crie um repositório público na sua conta GitHub, por exemplo revista-prazeres-interrompidos.
2. Extraia o ZIP e carregue o seu conteúdo na raiz, incluindo a pasta vendor e todos os ficheiros HTML, CSS e JS.
3. No GitHub: Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save.
4. Aguarde a publicação e abra o endereço HTTPS apresentado pelo GitHub. Teste a edição e os áudios nesse endereço.
5. Em cada mês, atualize editions.js pelo ficheiro exportado. O GitHub Pages volta a publicar. Faça uma atualização forçada do navegador se estiver a ver uma versão em cache.

O leitor não exige servidor, base de dados, serviços pagos ou configuração de domínio. Pode ser alojado noutro servidor de ficheiros estáticos. A gratuitidade do GitHub Pages está sujeita aos limites vigentes do serviço; confirme-os em https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits . Áudios e imagens volumosos contam para o espaço e tráfego. Este pacote não inclui um sistema de distribuição de áudio.

## Integrar em www.prazeresinterrompidos.pt

Depois de publicar no GitHub Pages, pode acrescentar uma ligação «Revista literária» ao Google Sites. Para incorporar: Inserir → Incorporar → Por URL, cole a ligação pública da revista e ajuste a altura. Pode usar o HTML abaixo, substituindo o endereço pelo URL confirmado da publicação:

```html
<iframe src="URL_PUBLICO_DA_REVISTA" title="Revista literária Prazeres Interrompidos" width="100%" height="1000" style="border:0" allow="fullscreen" allowfullscreen></iframe>
```

Mantenha também uma ligação «Abrir revista numa nova janela», particularmente útil em telemóveis e quando a incorporação restringe o ecrã completo. A demonstração privada de revisão não deve ser usada como incorporação pública. Nenhuma alteração foi feita no site atual.

## Ficheiros

- index.html: leitor.
- style.css: identidade, paginação e adaptação a ecrãs pequenos.
- app.js: animação, índice, áudio, ampliação, arquivo e retoma.
- editions.js: todas as edições e textos integrais; imagens carregadas pelo editor são incorporadas neste ficheiro, facilitando a gestão.
- editor.html / editor.js: oficina de preparação e exportação.
- vendor/page-flip.js: StPageFlip 2.0.7, licença MIT.
- vendor/LICENSE-StPageFlip.txt: licença original, a manter na distribuição.

O código próprio deste protótipo pode ser usado e adaptado pelo projeto. Os materiais editoriais reais mantêm os direitos dos seus titulares. Não é necessário colocar qualquer marca comercial visível da biblioteca de animação.
