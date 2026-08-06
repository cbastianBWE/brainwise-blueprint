import { jsPDF } from "jspdf";
(jsPDF as any).prototype.save = function () {
  console.log("PAGES:", this.getNumberOfPages());
  return this;
};
