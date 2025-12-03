/**
 * Invoice PDF Generator
 * Generates PDF invoices using browser print functionality
 */

import { getCurrencySymbol } from './calculations';

/**
 * Generate and download invoice as PDF
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company data
 * @param {Object} offload - Offload event data
 */
export const generateInvoicePDF = (invoice, company, offload) => {
  // Create a new window for the invoice
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to download the invoice PDF');
    return;
  }

  const currencySymbol = getCurrencySymbol(invoice.currency || company?.currency || 'USD');
  const unit = invoice.lineItems[0]?.unit || 'L';

  // Generate HTML for the invoice
  const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      color: #333;
      background: white;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0F4C81;
    }
    
    .company-info h1 {
      color: #0F4C81;
      font-size: 28px;
      margin-bottom: 5px;
    }
    
    .company-info p {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .invoice-title {
      text-align: right;
    }
    
    .invoice-title h2 {
      font-size: 36px;
      color: #0F4C81;
      margin-bottom: 10px;
    }
    
    .invoice-title p {
      font-size: 14px;
      color: #666;
    }
    
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .section h3 {
      color: #0F4C81;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 15px;
      letter-spacing: 0.5px;
    }
    
    .section p {
      font-size: 14px;
      line-height: 1.8;
      color: #333;
    }
    
    .section strong {
      color: #0F4C81;
      font-weight: 600;
    }
    
    .line-items {
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    thead {
      background: #0F4C81;
      color: white;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    th:last-child,
    td:last-child {
      text-align: right;
    }
    
    tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }
    
    tbody tr:hover {
      background: #f8f9fa;
    }
    
    td {
      padding: 15px 12px;
      font-size: 14px;
    }
    
    .totals {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      width: 300px;
    }
    
    .totals-table tr {
      border: none;
    }
    
    .totals-table td {
      padding: 8px 12px;
      font-size: 14px;
    }
    
    .totals-table td:first-child {
      text-align: right;
      color: #666;
      font-weight: 500;
    }
    
    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .total-row {
      border-top: 2px solid #0F4C81;
      background: #f8f9fa;
    }
    
    .total-row td {
      font-size: 18px;
      font-weight: 700;
      color: #0F4C81;
      padding: 15px 12px;
    }
    
    .payment-terms {
      margin-top: 40px;
      padding: 20px;
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    
    .payment-terms h4 {
      color: #f57c00;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .payment-terms p {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-paid {
      background: #d4edda;
      color: #155724;
    }
    
    .status-unpaid {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-overdue {
      background: #f8d7da;
      color: #721c24;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .invoice-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${company?.name || 'FleetTrack'}</h1>
        <p>${company?.address || ''}</p>
        <p>${company?.email || ''}</p>
        <p>${company?.phone || ''}</p>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p><strong>#${invoice.invoiceNumber}</strong></p>
        <p class="status-badge status-${invoice.status}">
          ${invoice.status.toUpperCase()}
        </p>
      </div>
    </div>
    
    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="section">
        <h3>Bill To</h3>
        <p><strong>${invoice.customer}</strong></p>
        ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ''}
        ${invoice.customerEmail ? `<p>Email: ${invoice.customerEmail}</p>` : ''}
        ${invoice.customerPhone ? `<p>Phone: ${invoice.customerPhone}</p>` : ''}
      </div>
      
      <div class="section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p><strong>Payment Terms:</strong> ${invoice.paymentTerms || 'Net 30 days'}</p>
        ${offload?.vehicleId ? `<p><strong>Vehicle:</strong> ${offload.vehicleId}</p>` : ''}
      </div>
    </div>
    
    <!-- Line Items -->
    <div class="line-items">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: center;">Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.lineItems.map(item => `
            <tr>
              <td>${item.description}</td>
              <td style="text-align: center;">${item.quantity.toLocaleString()} ${item.unit}</td>
              <td style="text-align: center;">${currencySymbol}${item.unitPrice.toFixed(2)}</td>
              <td>${currencySymbol}${item.subtotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td>${currencySymbol}${invoice.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>VAT (${invoice.vatRate}%):</td>
          <td>${currencySymbol}${invoice.vatAmount.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td>${currencySymbol}${invoice.total.toFixed(2)}</td>
        </tr>
        ${invoice.amountPaid > 0 ? `
          <tr>
            <td>Amount Paid:</td>
            <td style="color: #28a745;">${currencySymbol}${invoice.amountPaid.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Outstanding:</td>
            <td style="color: #dc3545;">${currencySymbol}${invoice.outstandingBalance.toFixed(2)}</td>
          </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Payment Terms -->
    ${invoice.status !== 'paid' ? `
      <div class="payment-terms">
        <h4>⚠️ Payment Information</h4>
        <p>Payment is due by <strong>${new Date(invoice.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
        <p>Please reference invoice number <strong>${invoice.invoiceNumber}</strong> when making payment.</p>
        ${invoice.notes ? `<p style="margin-top: 10px;"><em>Note: ${invoice.notes}</em></p>` : ''}
      </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated on ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>
  
  <script>
    // Auto-print when page loads
    window.onload = function() {
      window.print();
      // Close window after printing (user can cancel)
      setTimeout(() => {
        window.close();
      }, 100);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
};

/**
 * Share invoice via email or messaging
 * @param {Object} invoice - Invoice data
 */
export const shareInvoice = (invoice) => {
  const subject = `Invoice ${invoice.invoiceNumber} - ${invoice.customer}`;
  const body = `
Dear ${invoice.customer},

Please find attached invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.total.toFixed(2)}.

Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-ZA')}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-ZA')}
Amount Due: ${invoice.currency} ${invoice.outstandingBalance.toFixed(2)}

Please remit payment by the due date.

Thank you for your business!
  `.trim();

  // Open email client
  const mailtoLink = `mailto:${invoice.customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

/**
 * View invoice in modal or new tab
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company data
 */
export const viewInvoicePreview = (invoice, company, offload) => {
  // For now, just generate PDF in new tab without auto-print
  const viewWindow = window.open('', '_blank');
  
  if (!viewWindow) {
    alert('Please allow popups to view the invoice');
    return;
  }

  const currencySymbol = getCurrencySymbol(invoice.currency || company?.currency || 'USD');

  // Same HTML as PDF but without auto-print
  const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} - Preview</title>
  <style>
    /* Same styles as generateInvoicePDF */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background: #f5f5f5; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #0F4C81; }
    .company-info h1 { color: #0F4C81; font-size: 28px; margin-bottom: 5px; }
    .company-info p { color: #666; font-size: 14px; line-height: 1.6; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 36px; color: #0F4C81; margin-bottom: 10px; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-paid { background: #d4edda; color: #155724; }
    .status-unpaid { background: #fff3cd; color: #856404; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    thead { background: #0F4C81; color: white; }
    th { padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 15px 12px; font-size: 14px; border-bottom: 1px solid #e0e0e0; }
    .totals { margin-top: 30px; display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .total-row { border-top: 2px solid #0F4C81; background: #f8f9fa; }
    .total-row td { font-size: 18px; font-weight: 700; color: #0F4C81; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${company?.name || 'FleetTrack'}</h1>
        <p>${company?.email || ''}</p>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p><strong>#${invoice.invoiceNumber}</strong></p>
        <p class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</p>
      </div>
    </div>
    
    <h3>Bill To: ${invoice.customer}</h3>
    <p>Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-ZA')}</p>
    <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-ZA')}</p>
    
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity.toLocaleString()} ${item.unit}</td>
            <td>${currencySymbol}${item.unitPrice.toFixed(2)}</td>
            <td>${currencySymbol}${item.subtotal.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr><td>Subtotal:</td><td>${currencySymbol}${invoice.subtotal.toFixed(2)}</td></tr>
        <tr><td>VAT (${invoice.vatRate}%):</td><td>${currencySymbol}${invoice.vatAmount.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Total:</td><td>${currencySymbol}${invoice.total.toFixed(2)}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>
  `;

  viewWindow.document.write(invoiceHTML);
  viewWindow.document.close();
};
