/**
 * Converte markdown para HTML formatado
 * Suporta: headings (h1-h3), bold, italic, listas e parágrafos
 * Remove asteriscos que não fazem parte da formatação
 * 
 * @param markdown String em formato markdown
 * @returns HTML formatado como string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Processa linha por linha mantendo ordem
  const lines = markdown.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let trimmed = line.trim();
    
    // Ignora linhas que são só símbolos de formatação
    if (trimmed === '###' || trimmed === '##' || trimmed === '#' || 
        trimmed === '*' || trimmed === '**' || trimmed === '***' ||
        trimmed === '****') {
      continue;
    }
    
    // Títulos H1-H3
    if (trimmed.startsWith('### ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      let title = trimmed.substring(4).trim();
      // Remove asteriscos do título
      title = title.replace(/\*+/g, '');
      if (title) processedLines.push(`<h3>${title}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      let title = trimmed.substring(3).trim();
      // Remove asteriscos do título
      title = title.replace(/\*+/g, '');
      if (title) processedLines.push(`<h2>${title}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      let title = trimmed.substring(2).trim();
      // Remove asteriscos do título
      title = title.replace(/\*+/g, '');
      if (title) processedLines.push(`<h1>${title}</h1>`);
      continue;
    }
    
    // Itens de lista
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      let content = trimmed.substring(2).trim();
      
      // Processa bold e italic dentro do item (ordem importante!)
      content = content
        .replace(/\*{4,}/g, '') // Remove 4 ou mais asteriscos consecutivos
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.+?)\*/g, '<em>$1</em>'); // Italic
      
      // Remove todos os asteriscos restantes
      content = content.replace(/\*/g, '');
      
      if (content) processedLines.push(`<li>${content}</li>`);
      continue;
    }
    
    // Linha vazia
    if (!trimmed) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      // Adiciona espaço menor entre seções
      if (processedLines.length > 0) {
        processedLines.push('<div class="spacing"></div>');
      }
      continue;
    }
    
    // Texto normal
    if (inList) {
      processedLines.push('</ul>');
      inList = false;
    }
    
    // Processa bold e italic (ordem importante!)
    let formatted = trimmed
      .replace(/\*{4,}/g, '') // Remove 4 ou mais asteriscos consecutivos
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + Italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.+?)\*/g, '<em>$1</em>'); // Italic
    
    // Remove todos os asteriscos restantes
    formatted = formatted.replace(/\*/g, '');
    
    if (formatted) processedLines.push(`<p>${formatted}</p>`);
  }
  
  // Fecha lista se ainda estiver aberta
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
}
