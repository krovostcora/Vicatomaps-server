/**
 * Fuel Price Scraper for tolls.eu
 * Description:
 *  - Extracts only â‚¬ prices per country
 *  - Removes local currency fragments
 *  - Saves data into MongoDB
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FuelPrice = require('../src/models/FuelPrice');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeFuelPrices() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer'
        ]
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    });


    console.log('Opening tolls.eu/fuel-prices...');
    await page.goto('https://www.tolls.eu/fuel-prices', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.table.fuel-prices');
    await sleep(1500);

    const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.table.fuel-prices .tr'))
            .filter(row => !row.classList.contains('heading'));

        const extractEuro = (text) => {
            const match = text && text.match(/â‚¬\s*([\d.,]+)/);
            return match ? parseFloat(match[1].replace(',', '.')) : null;
        };

        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('.td'));
            return {
                countryCode: cells[0]?.querySelector('input')?.value || '',
                country: cells[1]?.innerText.trim(),
                gasoline: extractEuro(cells[2]?.innerText),
                diesel: extractEuro(cells[3]?.innerText),
                lpg: extractEuro(cells[4]?.innerText),
            };
        }).filter(item => item.country);
    });

    console.log(`Scraped ${data.length} countries`);

    await FuelPrice.deleteMany({});
    await FuelPrice.insertMany(data);
    console.log('Data saved to MongoDB');

    // Graceful disconnect
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        await mongoose.disconnect();
        console.log('MongoDB disconnected cleanly');
    } catch (err) {
        console.warn('Warning while closing MongoDB:', err.message);
    }

    await browser.close();
    console.log('Task complete');
}

scrapeFuelPrices().catch(err => {
    console.error('Scraper failed:', err);
    mongoose.disconnect();
});