function chunkText(text: string, maxChunkSize: number = 30000): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  let currentChunk = "";

  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (
      currentChunk.length + paragraph.length + 1 > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = paragraph + "\n";
    } else {
      currentChunk += paragraph + "\n";
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
