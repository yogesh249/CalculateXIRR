(function () {
  
  function removeDateSuffix(dateStr) {
  return dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');  // Removes st, nd, rd, th
}
  
  
  // Function to extract and generate table
  function generateTable(html) {
    // Create a temporary DOM element to parse the HTML content
    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');

    // Extract current NAV
    const currentNAVElement = document.querySelector('.b-fund-detail-desktop__subtext__nav__value');
    const currentNAV = currentNAVElement ? currentNAVElement.textContent.trim() : 'N/A';

    // Extract current value
    const currentValueElement = document.querySelector('.b-fund-detail-desktop__info__value__amount');
    let currentValue = currentValueElement ? currentValueElement.textContent.trim() : 'N/A';

    currentValue = currentValue.replace('₹', '').replace(/,/g, '').trim();

    // Remove the rupee symbol and commas from the content
    document.querySelectorAll('.font-family--rubik').forEach(element => {
      element.textContent = element.textContent.replace('₹', '').replace(/,/g, '').trim();
    });

    // Remove commas from other numeric content
    document.querySelectorAll('.b-transactions-desktop__item__amount__value, .b-transactions-desktop__item__date-section__info__units, .b-transactions-desktop__item__date-section__info__nav').forEach(element => {
      element.textContent = element.textContent.replace(/,/g, '').trim();
    });

    // Extract headers (excluding the Redeemed column)
    const headers = Array.from(
      document.querySelector('.b-transactions-desktop__title').children
    ).map((header, index) => {
      return index !== 2 ? header.textContent.trim() : null; // Exclude the 3rd column (Redeemed)
    }).filter(header => header !== null); // Filter out null values

    // Extract rows (excluding the Redeemed column)
    const rows = Array.from(document.querySelectorAll('.b-transactions-desktop__item')).map(row => {
      const cells = Array.from(row.children).map(cell => cell.textContent.trim());
      const invested = cells[1]; // Assuming Invested is the second column (index 1)

      // If invested is empty or contains a hyphen, use the value from redeemed
      if (!invested || invested === '-' || invested === ' -') {
        cells[1] = cells[2]; // Copy redeemed value to invested
      }
      else
      {
        // Multiply the invested value by -1
        cells[1] = parseFloat(cells[1].replace('₹', '').replace(/,/g, '').trim()) * -1;
      }
      // Remove the Redeemed column (index 2)
      cells.splice(2, 1);

      return cells;
    });

    // Add the first row with today's date and the current value as invested
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }); // Format: DD MMM YYYY

    rows.unshift([formattedDate, parseFloat(currentValue), 0.0, currentNAV]); // Today's date, currentValue (Invested), NAV

    // Sort rows by date in increasing order
  rows.sort((a, b) => {
    // Convert date from DD MMM YYYY to Date object
    const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split(' ');
        const dayNumber = parseInt(day, 10);  // Ensure the day is treated as a number
        const monthIndex = new Date(`${month} 1, 2020`).getMonth(); // Get month index from month name
        return new Date(year, monthIndex, dayNumber); // Return Date object
    };

    const dateA = parseDate(a[0]); // Convert first column (date) to Date object
    const dateB = parseDate(b[0]); // Convert second column (date) to Date object

    return dateA - dateB; // Compare dates for sorting
	});

    // Calculate XIRR
    const dateArray = [];
    const cashFlowArray = [];

    // Add all dates and cash flows (investments and redeemed) into arrays
    rows.forEach(row => {
      row[0]=removeDateSuffix(row[0]);
      dateArray.push(new Date(row[0])); // Date is assumed to be in the first column (index 0)
      cashFlowArray.push(parseFloat(row[1])); // Invested (negative) or redeemed (positive) amount
    });

    // Assuming the current value is redeemed today
    //dateArray.push(new Date()); // Current date
    //cashFlowArray.push(parseFloat(currentValue)); // Current value (redeemed amount)

    // XIRR function to calculate the internal rate of return
function calculateXIRR(values, dates, guess = 0.2) {
  const maxIterations = 500; // Increased iterations
  const tolerance = 1e-6;    // Relaxed tolerance

  if (values.length !== dates.length || values.length < 2) {
    throw new Error('Values and dates must have the same length and contain at least two items.');
  }

  if (!values.some(v => v > 0) || !values.some(v => v < 0)) {
    throw new Error('At least one positive and one negative cash flow are required.');
  }

  let rate = guess;

  for (let iter = 0; iter < maxIterations; iter++) {
    let f = 0;
    let fPrime = 0;

    for (let i = 0; i < values.length; i++) {
      const days = (dates[i] - dates[0]) / (1000 * 60 * 60 * 24); // Days between dates
      const years = days / 365; // Convert days to years

      const denominator = Math.pow(1 + rate, years);
      f += values[i] / denominator;
      fPrime -= (years * values[i]) / (denominator * (1 + rate));
    }

    const newRate = rate - f / fPrime;

    console.log(`Iteration ${iter}: Rate = ${rate.toFixed(6)}, f = ${f.toFixed(6)}, fPrime = ${fPrime.toFixed(6)}`);

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Convert to percentage
    }

    rate = newRate;
  }

  throw new Error('XIRR calculation did not converge');
}

    console.log(cashFlowArray);
    console.log(dateArray);

    const XIRRValue = calculateXIRR(cashFlowArray, dateArray).toFixed(2);

    // Generate HTML table
    let tableHTML = `<h2>Current Value: ₹${currentValue}</h2>`;
    tableHTML += `<h2>Current NAV: ₹${currentNAV}</h2>`;
    tableHTML += `<h2>XIRR: ${XIRRValue}%</h2>`;
    tableHTML += '<table border="1" style="border-collapse: collapse; width: 100%;">\n<tr>';
    headers.forEach(header => tableHTML += `<th style="background-color: #f2f2f2; position: sticky; top: 0; z-index: 1;">${header}</th>`);
    tableHTML += '</tr>\n';

    rows.forEach(row => {
      tableHTML += '<tr>';
      row.forEach(cell => tableHTML += `<td style="border: 1px solid black; padding: 8px;">${cell}</td>`);
      tableHTML += '</tr>\n';
    });

    tableHTML += '</table>';

    // Remove ordinal suffixes (st, nd, rd, th) from the entire HTML
    tableHTML = tableHTML.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');

    return tableHTML;
  }

  // Get the current HTML content of the page
  const htmlContent = document.documentElement.outerHTML;

  // Generate the table
  const generatedTable = generateTable(htmlContent);

  // Open a new window and display the table
  const newWindow = window.open('', '_blank');
  newWindow.document.open();
  newWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated Table</title>
        <style>
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    border: 1px solid black;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
    position: sticky;
    top: 0; /* Sticks the header to the top of the viewport when scrolling */
    z-index: 1; /* Ensures the headers are above other content */
  }
  h2 {
    font-size: 20px;
    color: #333;
    margin-bottom: 10px;
  }
</style>

      </head>
      <body>
        ${generatedTable}
      </body>
    </html>
  `);
  newWindow.document.close();
})();
