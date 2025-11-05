(function () {
  
  function animateNumber(finalNumber, duration = 2000) {
    const element = document.getElementById("bottomLeftElement"); 
    const startTime = performance.now(); 
    const startNumber = 0; 

    function updateNumber(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1); 
        const currentNumber = (progress * finalNumber).toFixed(2);
		
        element.innerHTML = "<h2> XIRR: " + currentNumber + " % " + "</h2>";

        if (progress < 1) {
            requestAnimationFrame(updateNumber); 
        }
    }

    requestAnimationFrame(updateNumber);
}
  
  xirr=0.0;
  function removeDateSuffix(dateStr) {
    return dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');  
  }
  function extractXirrFromHtml(html) {
    const xirrMatch = html.match(/<h2>XIRR: (\d+\.\d+)%<\/h2>/);
    if (xirrMatch) {
      return parseFloat(xirrMatch[1]);
    }
    return null;
  }

  
  function generateTable(html) {
    
    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');

    
    const currentNAVElement = document.querySelector('.b-fund-detail-desktop__subtext__nav__value');
    const currentNAV = currentNAVElement ? currentNAVElement.textContent.trim() : 'N/A';

    
    const currentValueElement = document.querySelector('.b-fund-detail-desktop__info__value__amount');
    let currentValue = currentValueElement ? currentValueElement.textContent.trim() : 'N/A';

    currentValue = currentValue.replace('₹', '').replace(/,/g, '').trim();

    
    document.querySelectorAll('.font-family--rubik').forEach(element => {
      element.textContent = element.textContent.replace('₹', '').replace(/,/g, '').trim();
    });

    
    document.querySelectorAll('.b-transactions-desktop__item__amount__value, .b-transactions-desktop__item__date-section__info__units, .b-transactions-desktop__item__date-section__info__nav').forEach(element => {
      element.textContent = element.textContent.replace(/,/g, '').trim();
    });

    
    const headers = Array.from(
      document.querySelector('.b-transactions-desktop__title').children
    ).map((header, index) => {
      return index !== 2 ? header.textContent.trim() : null; 
    }).filter(header => header !== null); 

    
    const rows = Array.from(document.querySelectorAll('.b-transactions-desktop__item')).map(row => {
      const cells = Array.from(row.children).map(cell => cell.textContent.trim());
      const invested = cells[1]; 

      
      if (!invested || invested === '-' || invested === ' -') {
        cells[1] = cells[2]; 
      }
      else {
        
        cells[1] = parseFloat(cells[1].replace('₹', '').replace(/,/g, '').trim()) * -1;
      }
      
      cells.splice(2, 1);

      return cells;
    });

    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }); 

    rows.unshift([formattedDate, parseFloat(currentValue), 0.0, currentNAV]); 

    
    rows.sort((a, b) => {
      
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split(' ');
        const dayNumber = parseInt(day, 10);  
        const monthIndex = new Date(`${month} 1, 2020`).getMonth(); 
        return new Date(year, monthIndex, dayNumber); 
      };

      const dateA = parseDate(a[0]); 
      const dateB = parseDate(b[0]); 

      return dateA - dateB; 
    });

    
    const dateArray = [];
    const cashFlowArray = [];

    
    rows.forEach(row => {
      row[0] = removeDateSuffix(row[0]);
      dateArray.push(new Date(row[0])); 
      cashFlowArray.push(parseFloat(row[1])); 
    });

    
    
    

    
    function calculateXIRR(values, dates, guess = 0.2) {
      const maxIterations = 500; 
      const tolerance = 1e-6;    

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
          const days = (dates[i] - dates[0]) / (1000 * 60 * 60 * 24); 
          const years = days / 365; 

          const denominator = Math.pow(1 + rate, years);
          f += values[i] / denominator;
          fPrime -= (years * values[i]) / (denominator * (1 + rate));
        }

        const newRate = rate - f / fPrime;

        console.log(`Iteration ${iter}: Rate = ${rate.toFixed(6)}, f = ${f.toFixed(6)}, fPrime = ${fPrime.toFixed(6)}`);

        if (Math.abs(newRate - rate) < tolerance) {
          return newRate * 100; 
        }

        rate = newRate;
      }

      throw new Error('XIRR calculation did not converge');
    }

    console.log(cashFlowArray);
    console.log(dateArray);

    const XIRRValue = calculateXIRR(cashFlowArray, dateArray).toFixed(2);
    xirr=XIRRValue;
    
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

    
    tableHTML = tableHTML.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');

    return tableHTML;
  }

  
  const htmlContent = document.documentElement.outerHTML;

  
  const generatedTable = generateTable(htmlContent);
var divElement = document.createElement('div');
divElement.innerHTML = "<h2>XIRR: " + xirr + "%</h2>";
divElement.id = "bottomLeftElement";


divElement.style.position = "fixed"; 
divElement.style.bottom = "0";       
divElement.style.right = "1";         
divElement.style.padding = "10px";   
divElement.style.backgroundColor = "lightcoral"; 
divElement.style.border = "1px solid #ccc";      
divElement.style.visible="true";
divElement.style["z-index"]=1000;
  document.body.appendChild(divElement);
  animateNumber(xirr, 1000);
  setInterval(function() { divElement.remove(); }, 3000);

})();
