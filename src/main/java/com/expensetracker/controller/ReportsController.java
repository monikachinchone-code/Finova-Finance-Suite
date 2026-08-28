package com.expensetracker.controller;

import com.expensetracker.entity.Expense;
import com.expensetracker.entity.Income;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.IncomeRepository;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportsController {

    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;

    public ReportsController(
            ExpenseRepository expenseRepository,
            IncomeRepository incomeRepository) {

        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
    }

    @GetMapping("/monthly")
    public ResponseEntity<byte[]> monthlyReport(
            @RequestParam String month,
            @RequestParam Long userId) {

        try {

            // ==========================================
            // GET MONTHLY DATA FOR SPECIFIC USER
            // ==========================================

            List<Expense> expenses =
                    expenseRepository
                            .findByUserIdAndDateStartingWith(
                                    userId,
                                    month
                            );

            List<Income> incomes =
                    incomeRepository
                            .findByUserIdAndDateStartingWith(
                                    userId,
                                    month
                            );

            // ==========================================
            // CALCULATE TOTALS
            // ==========================================

            double totalExpense = expenses.stream()
                    .mapToDouble(Expense::getAmount)
                    .sum();

            double totalIncome = incomes.stream()
                    .mapToDouble(Income::getAmount)
                    .sum();

            double balance = totalIncome - totalExpense;

            // ==========================================
            // FORMAT CURRENCY
            // ==========================================

            NumberFormat currency =
                    NumberFormat.getNumberInstance(
                            new Locale("en", "IN")
                    );

            currency.setMinimumFractionDigits(0);
            currency.setMaximumFractionDigits(2);

            // ==========================================
            // FORMAT MONTH
            // ==========================================

            YearMonth yearMonth =
                    YearMonth.parse(month);

            String formattedMonth =
                    yearMonth.format(
                            DateTimeFormatter.ofPattern(
                                    "MMMM yyyy"
                            )
                    );

            // ==========================================
            // CREATE PDF
            // ==========================================

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            Document document =
                    new Document(
                            PageSize.A4,
                            40,
                            40,
                            40,
                            40
                    );

            PdfWriter.getInstance(
                    document,
                    outputStream
            );

            document.open();

            // ==========================================
            // FONTS
            // ==========================================

            Font titleFont =
                    new Font(
                            Font.HELVETICA,
                            20,
                            Font.BOLD
                    );

            Font subtitleFont =
                    new Font(
                            Font.HELVETICA,
                            13,
                            Font.BOLD
                    );

            Font headingFont =
                    new Font(
                            Font.HELVETICA,
                            12,
                            Font.BOLD
                    );

            Font normalFont =
                    new Font(
                            Font.HELVETICA,
                            10,
                            Font.NORMAL
                    );

            Font smallFont =
                    new Font(
                            Font.HELVETICA,
                            9,
                            Font.NORMAL
                    );

            Font boldFont =
                    new Font(
                            Font.HELVETICA,
                            10,
                            Font.BOLD
                    );

            // ==========================================
            // HEADER
            // ==========================================

            Paragraph appName =
                    new Paragraph(
                            "EXPENSE TRACKER",
                            titleFont
                    );

            appName.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(appName);

            Paragraph reportTitle =
                    new Paragraph(
                            "MONTHLY FINANCIAL REPORT",
                            subtitleFont
                    );

            reportTitle.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(reportTitle);

            Paragraph monthText =
                    new Paragraph(
                            "Report Month: "
                                    + formattedMonth,
                            normalFont
                    );

            monthText.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(monthText);

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // GREETING
            // ==========================================

            Paragraph greeting =
                    new Paragraph(
                            "Hello! Here is your monthly "
                                    + "financial summary for "
                                    + formattedMonth + ".",
                            normalFont
                    );

            greeting.setAlignment(
                    Element.ALIGN_LEFT
            );

            document.add(greeting);

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // REPORT SUMMARY
            // ==========================================

            Paragraph summaryHeading =
                    new Paragraph(
                            "REPORT SUMMARY",
                            headingFont
                    );

            document.add(summaryHeading);

            document.add(
                    new Paragraph(" ")
            );

            PdfPTable summaryTable =
                    new PdfPTable(2);

            summaryTable.setWidthPercentage(100);

            summaryTable.setWidths(
                    new float[]{3, 2}
            );

            addSummaryRow(
                    summaryTable,
                    "Total Income",
                    "₹" + currency.format(totalIncome),
                    boldFont
            );

            addSummaryRow(
                    summaryTable,
                    "Total Expenses",
                    "₹" + currency.format(totalExpense),
                    boldFont
            );

            addSummaryRow(
                    summaryTable,
                    "Remaining Balance",
                    "₹" + currency.format(balance),
                    boldFont
            );

            document.add(summaryTable);

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // EXPENSE DETAILS
            // ==========================================

            Paragraph expenseHeading =
                    new Paragraph(
                            "EXPENSE DETAILS",
                            headingFont
                    );

            document.add(expenseHeading);

            document.add(
                    new Paragraph(" ")
            );

            PdfPTable table =
                    new PdfPTable(4);

            table.setWidthPercentage(100);

            table.setWidths(
                    new float[]{2, 3, 2.5f, 2}
            );

            addTableHeader(
                    table,
                    "Date",
                    boldFont
            );

            addTableHeader(
                    table,
                    "Title",
                    boldFont
            );

            addTableHeader(
                    table,
                    "Category",
                    boldFont
            );

            addTableHeader(
                    table,
                    "Amount",
                    boldFont
            );

            // ==========================================
            // EXPENSE DATA
            // ==========================================

            if (expenses.isEmpty()) {

                PdfPCell noExpenseCell =
                        new PdfPCell(
                                new Phrase(
                                        "No expenses recorded "
                                                + "for this month.",
                                        normalFont
                                )
                        );

                noExpenseCell.setColspan(4);

                noExpenseCell.setHorizontalAlignment(
                        Element.ALIGN_CENTER
                );

                noExpenseCell.setPadding(8);

                table.addCell(noExpenseCell);

            } else {

                for (Expense expense : expenses) {

                    table.addCell(
                            new Phrase(
                                    expense.getDate(),
                                    smallFont
                            )
                    );

                    table.addCell(
                            new Phrase(
                                    expense.getTitle(),
                                    smallFont
                            )
                    );

                    table.addCell(
                            new Phrase(
                                    expense.getCategory(),
                                    smallFont
                            )
                    );

                    table.addCell(
                            new Phrase(
                                    "₹"
                                            + currency.format(
                                            expense.getAmount()
                                    ),
                                    smallFont
                            )
                    );
                }
            }

            document.add(table);

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // FINANCIAL OVERVIEW
            // ==========================================

            Paragraph overviewHeading =
                    new Paragraph(
                            "FINANCIAL OVERVIEW",
                            headingFont
                    );

            document.add(overviewHeading);

            document.add(
                    new Paragraph(" ")
            );

            document.add(
                    new Paragraph(
                            "Income received: ₹"
                                    + currency.format(
                                    totalIncome
                            ),
                            normalFont
                    )
            );

            document.add(
                    new Paragraph(
                            "Expenses incurred: ₹"
                                    + currency.format(
                                    totalExpense
                            ),
                            normalFont
                    )
            );

            document.add(
                    new Paragraph(
                            "Available balance: ₹"
                                    + currency.format(
                                    balance
                            ),
                            normalFont
                    )
            );

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // CLOSING MESSAGE
            // ==========================================

            Paragraph closing =
                    new Paragraph(
                            "Thank you for using Expense Tracker. "
                                    + "Keep tracking your finances "
                                    + "regularly for better "
                                    + "financial management.",
                            normalFont
                    );

            closing.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(closing);

            document.add(
                    new Paragraph(" ")
            );

            // ==========================================
            // FOOTER INFORMATION
            // ==========================================

            Paragraph generated =
                    new Paragraph(
                            "Generated by Expense Tracker",
                            smallFont
                    );

            generated.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(generated);

            Paragraph generatedDate =
                    new Paragraph(
                            "Generated on: "
                                    + LocalDate.now()
                                    .format(
                                            DateTimeFormatter.ofPattern(
                                                    "dd MMMM yyyy"
                                            )
                                    ),
                            smallFont
                    );

            generatedDate.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(generatedDate);

            // ==========================================
            // CLOSE DOCUMENT
            // ==========================================

            document.close();

            byte[] pdfBytes =
                    outputStream.toByteArray();

            // ==========================================
            // DOWNLOAD RESPONSE
            // ==========================================

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=Monthly-Report-"
                                    + month
                                    + ".pdf"
                    )
                    .contentType(
                            MediaType.APPLICATION_PDF
                    )
                    .body(pdfBytes);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .internalServerError()
                    .build();
        }
    }

    // ==============================================
    // SUMMARY TABLE ROW
    // ==============================================

    private void addSummaryRow(
            PdfPTable table,
            String label,
            String value,
            Font font) {

        PdfPCell labelCell =
                new PdfPCell(
                        new Phrase(label, font)
                );

        PdfPCell valueCell =
                new PdfPCell(
                        new Phrase(value, font)
                );

        valueCell.setHorizontalAlignment(
                Element.ALIGN_RIGHT
        );

        labelCell.setPadding(6);
        valueCell.setPadding(6);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    // ==============================================
    // TABLE HEADER
    // ==============================================

    private void addTableHeader(
            PdfPTable table,
            String text,
            Font font) {

        PdfPCell cell =
                new PdfPCell(
                        new Phrase(text, font)
                );

        cell.setHorizontalAlignment(
                Element.ALIGN_CENTER
        );

        cell.setPadding(6);

        table.addCell(cell);
    }
}