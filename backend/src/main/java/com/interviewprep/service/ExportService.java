package com.interviewprep.service;

import com.interviewprep.domain.Document;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.element.Paragraph;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ExportService {

    public byte[] toPdf(Document doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdf = new PdfDocument(writer);
             com.itextpdf.layout.Document layout = new com.itextpdf.layout.Document(pdf)) {

            layout.add(new Paragraph(doc.getFilename()).setBold().setFontSize(16));
            String text = doc.getExtractedText() == null ? "" : doc.getExtractedText();
            for (String para : text.split("\n\n")) {
                layout.add(new Paragraph(para));
            }
            layout.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF export failed", e);
        }
    }

    public byte[] toDocx(Document doc) {
        try (XWPFDocument docx = new XWPFDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            XWPFParagraph title = docx.createParagraph();
            XWPFRun titleRun = title.createRun();
            titleRun.setBold(true);
            titleRun.setFontSize(16);
            titleRun.setText(doc.getFilename());

            String text = doc.getExtractedText() == null ? "" : doc.getExtractedText();
            for (String para : text.split("\n\n")) {
                XWPFParagraph p = docx.createParagraph();
                p.createRun().setText(para);
            }
            docx.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("DOCX export failed", e);
        }
    }
}
