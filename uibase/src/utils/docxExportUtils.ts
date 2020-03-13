import {Document, Media, Packer, Paragraph, Table, TableCell, TableRow, TextRun} from "docx";
import {saveAs} from "file-saver";

export enum docxElementExportType {
    diagram,
    grid,
    text
}

export interface docxExportObject {
    docxComponentType: docxElementExportType;
    diagramData?: Uint8Array,
    gridData?: string[][],
    textData?: string
}

async function handleExportDocx(context: any) {
    const doc: Document = new Document();
    let paragraphs: (Paragraph|Table)[] = [];
    for (let i = 0; i < context.docxHandlers.length; i++) {
        let docxData: docxExportObject = await context.docxHandlers[i]();
        if (docxData.docxComponentType === docxElementExportType.diagram && docxData.diagramData !== undefined) {
            //Добавление диаграммы в png
            const image = Media.addImage(doc, docxData.diagramData, 1400, 400);
            paragraphs.push(new Paragraph(image))
        }
        if (docxData.docxComponentType === docxElementExportType.grid && docxData.gridData !== undefined) {
            //Добавление таблицы
            let tableRows: TableRow[] = [];
            for (const row of docxData.gridData) {
                let tableRow: TableCell[] = [];
                for (const cell of row) {
                    tableRow.push(new TableCell({children: [new Paragraph(cell)]}));
                }
                tableRows.push(new TableRow({
                    children: tableRow
                }))
            }
            const table: Table = new Table({
                rows: tableRows
            });
            paragraphs.push(table)
        }
        if (docxData.docxComponentType === docxElementExportType.text && docxData.textData !== undefined) {
            //Добавление текста
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun(docxData.textData)
                ]
            }))
        }
        //Разделитель
        paragraphs.push(new Paragraph({
            children: [
                new TextRun("")
            ]
        }))
    }
    doc.addSection({
        properties: {},
        children: paragraphs
    });
    Packer.toBlob(doc).then(blob => {
        console.log(blob);
        saveAs(blob, "example.docx");
        console.log("Document created successfully");
    });
}

export {handleExportDocx};