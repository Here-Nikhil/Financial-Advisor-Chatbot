// AI Gig Worker Finance Advisor - Using Gemini API

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const financeKeywords = [
  'tax', 'taxes', 'deduction', 'invoice', 'income', 'expense', 'money', 'payment',
  'salary', 'wage', 'pricing', 'rate', 'budget', 'saving', 'savings', 'investment', 
  'investments', 'stock', 'stocks', 'market', 'fund', 'mutual fund', 'etf', 'portfolio',
  'retirement', 'ira', '401k', 'roth', 'loan', 'debt', 'credit', 'mortgage',
  'insurance', 'premium', 'financial', 'finances', 'banking', 'bank', 'interest',
  'billing', 'accounting', 'bookkeeping', 'revenue', 'profit', 'loss', 'net worth',
  'gig economy', 'freelance', 'self-employed', 'independent contractor',
  'quarterly', 'write-off', 'mileage', 'home office', 'schedule c', '1099', 'w9', 
  'assets', 'liabilities', 'balance sheet', 'cash flow', 'roi', 'return on investment',
  'tax planning', 'wealth', 'capital gain', 'dividend', 'income tax', 'budgeting',
  'pension', 'social security', 'financial goals', 'emergency fund', 'tax refund',
  'credit score', 'fico', 'loan interest', 'compound interest', 'equity',
  'annuity', 'bond', 'bonds', 'brokerage', 'capital', 'cash reserve', 'commodities',
  'cryptocurrency', 'bitcoin', 'blockchain', 'deficit', 'depreciation', 'diversification',
  'escrow', 'estate planning', 'fiduciary', 'fixed income', 'hedge fund', 'index fund',
  'inflation', 'leverage', 'liquidity', 'net income', 'overdraft', 'payroll', 'refinancing',
  'risk management', 'savings account', 'tax bracket', 'treasury', 'trust fund', 
  'venture capital', 'yield', 'amortization', 'credit report', 'foreclosure', 'bankruptcy',
  'financial advisor', 'tax return', 'withholding', 'expense tracking', 'financial literacy',
  'stock option', 'bear market', 'bull market', 'dividend yield', 'market crash', 
  'recession', 'wealth management', 'tax shelter', 'offshore account', 'money market',
  'certificate of deposit', 'cd', 'escrow account', 'fiscal year', 'gross income',
  'tax credit', 'itemized deduction', 'standard deduction', 'capital loss', 'short selling',
  'margin', 'derivatives', 'futures', 'options trading', 'private equity', 'real estate',
  'rental income', 'passive income', 'crowdfunding', 'peer-to-peer lending', 'credit limit',
  'annual percentage rate', 'apr', 'credit union', 'debit', 'direct deposit', 'wire transfer', 'financial planner', 'taxable income', 'charitable contribution', 'estate tax', 'gift tax'
];

function isFinanceQuery(query) {
  query = query.toLowerCase();
  return financeKeywords.some(keyword => query.includes(keyword));
}

async function getFinancialData(topic) {
  try {
    if (topic.includes('tax')) {
      return { federalTaxRate: "22%", stateTaxRate: "5%" };
    } else if (topic.includes('stock') || topic.includes('market')) {
      return { marketStatus: "Open", sampleStockPrice: "$150" };
    } else if (topic.includes('currency') || topic.includes('exchange')) {
      return { usdToEur: "0.85", lastUpdated: "2025-03-22" };
    }
    return null;
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return null;
  }
}

async function generateResponse(query, financialData) {
  try {
    const systemPrompt = `You are an AI Finance Advisor specialized in helping gig workers, freelancers, and independent contractors with their financial questions. 
    Focus on tax advice, expense tracking, retirement planning, and financial management specific to self-employed individuals.
    If financial data is provided, incorporate it into your answer.
    Only answer finance-related questions. For any other topics, respond with: "I'm sorry, I can only answer questions related to finance for gig workers. Please ask a finance-related question."`;

    let userPrompt = `${systemPrompt}\n\nUser Query: ${query}`;
    if (financialData) {
      userPrompt += `\n\nRelevant financial data: ${JSON.stringify(financialData)}`;
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      {
        contents: [{
          parts: [{
            text: userPrompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        }
      }
    );

    console.log('Gemini API Response:', JSON.stringify(response.data, null, 2));

    if (!response.data.candidates || !response.data.candidates[0].content) {
      throw new Error('Unexpected API response format');
    }

    return response.data.candidates[0].content.parts[0].text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error generating response with Gemini API:', error.response?.data || error.message);
    return "I'm having trouble generating a response right now. Please try again later.";
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { query } = req.body;
    console.log('Received query:', query);

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const isFinance = isFinanceQuery(query);
    console.log('Is finance-related:', isFinance);
    
    if (!isFinance) {
      return res.json({
        response: "I'm sorry, I can only answer questions related to finance for gig workers. Please ask a finance-related question."
      });
    }

    const financialData = await getFinancialData(query);
    console.log('Financial data:', financialData);
    
    const response = await generateResponse(query, financialData);
    console.log('Generated response:', response);

    return res.json({ response });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gig Worker Finance Advisor running on port ${PORT}`);
});

module.exports = app;