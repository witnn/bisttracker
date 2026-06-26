const yahooFinancePkg = require('yahoo-finance2');
const YahooFinance = yahooFinancePkg.default || yahooFinancePkg;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function check() {
  try {
    const queryOptions = {
        period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        interval: '1d'
    };
    const result = await yahooFinance.chart('GC=F', queryOptions);
    console.log('chart GC=F works:', result.quotes.length, 'quotes');
    console.log(result.quotes[0]);
  } catch (e) {
    console.error('chart error:', e.message);
  }
}
check();
