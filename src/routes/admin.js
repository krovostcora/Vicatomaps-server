// src/routes/admin.js
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const FuelPrice = require('../models/FuelPrice');
const path = require('path');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main scraping function (extracted from scrapeFuelPrices.js)
 */
async function scrapeFuelPrices() {
    console.log('⛽ Starting fuel price scraping...');

    let browser;
    try {

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
            puppeteer.executablePath();

        browser = await puppeteer.launch({
            headless: true,
            executablePath,
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

        console.log('🌍 Opening tolls.eu/fuel-prices...');
        await page.goto('https://www.tolls.eu/fuel-prices', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('.table.fuel-prices', { timeout: 10000 });
        await sleep(1500);

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.table.fuel-prices .tr'))
                .filter(row => !row.classList.contains('heading'));

            const extractEuro = (text) => {
                const match = text && text.match(/€\s*([\d.,]+)/);
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

        console.log(`✅ Scraped ${data.length} countries`);

        if (data.length > 0) {
            await FuelPrice.deleteMany({});
            await FuelPrice.insertMany(data);
            console.log('💾 Data saved to MongoDB');
        } else {
            console.warn('⚠️ No data scraped!');
        }

        await browser.close();
        return { success: true, count: data.length };

    } catch (error) {
        console.error('❌ Scraping failed:', error);
        if (browser) await browser.close();
        throw error;
    }
}

/**
 * POST /api/admin/fuel/update
 * Manual or cron trigger for fuel price update
 */
router.post('/fuel/update', async (req, res) => {
    try {
        console.log('🔄 Fuel price update triggered (POST)...');
        const result = await scrapeFuelPrices();
        res.status(200).json({
            success: true,
            message: '✅ Fuel prices updated successfully!',
            count: result.count
        });
    } catch (err) {
        console.error('❌ Fuel price update failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/admin/fuel/update
 * Browser-friendly trigger (for testing)
 */
router.get('/fuel/update', async (req, res) => {
    try {
        console.log('🌍 Fuel price update triggered (GET)...');
        const result = await scrapeFuelPrices();
        res.status(200).json({
            success: true,
            message: '✅ Fuel prices updated successfully (GET)!',
            count: result.count
        });
    } catch (err) {
        console.error('❌ Fuel price update (GET) failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/admin/fuel/status
 * Check last update time and count
 */
router.get('/fuel/status', async (req, res) => {
    try {
        const count = await FuelPrice.countDocuments();
        const latest = await FuelPrice.findOne().sort({ updatedAt: -1 });

        res.json({
            success: true,
            totalCountries: count,
            lastUpdate: latest?.updatedAt || null
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;