# Biblioteca de mídias — Tempero Caseiro

Os arquivos originais da raiz são preservados. A pasta `optimized/` contém derivados para a web e um manifesto com dimensões e tamanhos.

```sh
npm ci
npm run optimize
```

Requer Node.js 22 ou superior. `sharp` gera imagens e o FFmpeg empacotado converte vídeos. A instalação do FFmpeg usa o pacote específico da plataforma.

- `optimized/images/`: WebP de 480, 960 e 1600 px, orientação corrigida e sem ampliar imagens menores.
- `optimized/videos/`: vídeos completos H.264/AAC, até 720 × 1280, proporção preservada, áudio mantido quando existente e `faststart`.
- `optimized/previews/`: clipes de 2 segundos, até 360 × 640, 20 fps, sem áudio.
- `optimized/posters/`: imagens estáticas para exibição antes de carregar vídeos.
- `optimized/manifest.json`: caminhos, dimensões e bytes dos originais e derivados.

O script processa fotos `f (n).jpg` / `p (n).jpg` e vídeos `v (n).mp4`, que compõem as galerias do site. Os demais arquivos da raiz permanecem disponíveis sem conversão. Ele reutiliza derivados existentes; após substituir um original ou mudar as opções, use `npm run optimize -- --force`. A gravação de vídeos usa um arquivo temporário e substitui o destino somente após uma conversão bem-sucedida.

No repositório `temperocaseiro`, `npm run sync:media` copia apenas os derivados usados nas galerias. Dessa forma o site serve suas imagens e vídeos na mesma origem e pode ser publicado sem aguardar o deploy do GitHub Pages. Não remova originais nem altere seus nomes: eles continuam como referências e fallback.
