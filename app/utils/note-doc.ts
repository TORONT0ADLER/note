export type JSONContent = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
};

export type NoteMeta = {
  plain: string;
  title: string;
  preview: string;
};

export const createDocFromText = (text: string): JSONContent => {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized ? normalized.split("\n") : [];
  const firstLine = lines[0]?.trim() || "Новая заметка";
  const body = lines.slice(1).join("\n").trim();

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: firstLine }],
      },
      {
        type: "paragraph",
        content: body ? [{ type: "text", text: body }] : undefined,
      },
    ],
  };
};

export const createEmptyDoc = (): JSONContent =>
  createDocFromText("Новая заметка");

export const createEmptyKanbanTaskDescription = (): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export const docToMarkdown = (node: JSONContent, listDepth = 0): string => {
  if (!node) return "";

  const children = (node.content || [])
    .map((child) => docToMarkdown(child, listDepth))
    .join("");

  switch (node.type) {
    case "doc":
      return children.trimEnd() + "\n";

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${children}\n\n`;
    }

    case "paragraph":
      return children ? `${children}\n\n` : "\n";

    case "text": {
      let text = node.text || "";
      const marks = (node as { marks?: { type: string }[] }).marks || [];
      for (const mark of marks) {
        if (mark.type === "bold") text = `**${text}**`;
        else if (mark.type === "italic") text = `*${text}*`;
        else if (mark.type === "code") text = `\`${text}\``;
        else if (mark.type === "underline") text = `<u>${text}</u>`;
        else if (mark.type === "link") {
          const href =
            (mark as { type: string; attrs?: { href?: string } }).attrs?.href ||
            "";
          text = `[${text}](${href})`;
        }
      }
      return text;
    }

    case "hardBreak":
      return "  \n";

    case "codeBlock": {
      const lang = (node.attrs?.language as string | undefined | null) || "";
      return `\`\`\`${lang}\n${children}\`\`\`\n\n`;
    }

    case "blockquote":
      return (
        children
          .split("\n")
          .map((line) => (line ? `> ${line}` : ">"))
          .join("\n") + "\n"
      );

    case "bulletList":
      return children + "\n";

    case "orderedList":
      return children + "\n";

    case "listItem": {
      const indent = "  ".repeat(listDepth);
      const lines = children.trimEnd().split("\n");
      const first = `${indent}- ${lines[0] || ""}`;
      const rest = lines
        .slice(1)
        .map((l) => (l ? `${indent}  ${l}` : ""))
        .join("\n");
      return rest ? `${first}\n${rest}\n` : `${first}\n`;
    }

    case "horizontalRule":
      return "---\n\n";

    default:
      return children;
  }
};

export const markdownToDoc = (md: string): JSONContent => {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++;
      content.push({
        type: "codeBlock",
        attrs: { language: lang || null },
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1]!.length },
        content: headingMatch[2]
          ? [{ type: "text", text: headingMatch[2] }]
          : [],
      });
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !lines[i]!.match(/^#{1,6}\s/) &&
      !lines[i]!.startsWith("```")
    ) {
      paraLines.push(lines[i]!);
      i++;
    }

    if (paraLines.length) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: paraLines.join("\n") }],
      });
    }
  }

  if (!content.length) {
    content.push({ type: "paragraph" });
  }

  return { type: "doc", content };
};

const readText = (node: JSONContent | undefined): string => {
  if (!node) return "";

  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";

  const children = (node.content || []).map(readText).join("");

  if (node.type === "tableCell" || node.type === "tableHeader") {
    return `${children}\t`;
  }

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote" ||
    node.type === "codeBlock" ||
    node.type === "listItem" ||
    node.type === "tableRow"
  ) {
    return `${children}\n`;
  }

  return children;
};

export const buildMeta = (doc: JSONContent): NoteMeta => {
  const plain = readText(doc)
    .replace(/\t+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  const lines = plain
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    plain,
    title: lines[0] || "Без названия",
    preview: lines.slice(1).join(" ") || "Пустая заметка",
  };
};
