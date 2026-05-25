// Registers the pdf.js worker URL once at app entry so any client-side PDF
// extraction (newsletter co-pilot attachments, etc.) has a worker available.
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
