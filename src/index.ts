import axios from 'axios';
import cheerio from 'cheerio';
import dotenv from 'dotenv';
import puppeteer, { Browser, Page } from 'puppeteer';


const puppeteerExtra = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
// puppeteerExtra.use(pluginStealth());

dotenv.config();

(async () => {

	// const url = 'https://streeteasy.com/';
	// const url = 'https://www.singaporeair.com/en_UK/us/home#/book/bookflight';
	const url = 'https://www.eventim.de/';
	await withPuppeteer(url);

})();

async function withPuppeteer(url: string) {

	const browser: Browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();

	await page.goto(url);

	await lookForAndSolveGee(url, page);

	await browser.close();
}

async function lookForAndSolveGee(url: string, page: Page) {

	page.goto(url);
	await page.waitFor(2500);

	const scripts = await page.$$('script');

	let geeTestSrc: URL;

	for (let script of scripts) {
		const src = await script.evaluate(element => element.getAttribute('src'));

		if (src && src.includes('geetest.com/get.php')) {
			geeTestSrc = new URL(src);
		}
	}

	if (geeTestSrc) {
		const geeTestUrl = new URLSearchParams(geeTestSrc.search);
		const gt = geeTestUrl.get('gt');
		const challenge = geeTestUrl.get('challenge');

		console.log('gt', gt, 'challenge', challenge, 'api-server', geeTestUrl.get('api_server'), 'pageUrl', page.url(), process.env.capatchaApiKey);

		const captchaApiStartUrl = `https://2captcha.com/in.php?key=${process.env.capatchaApiKey}&method=geetest&gt=${gt}&challenge=${challenge}&json=true&pageurl=${page.url()}`;

		const axiosResponse = await axios.get(captchaApiStartUrl);
		console.log('axiosResponse to start solve', axiosResponse.data);

		await getGeeTestResult(axiosResponse.data.request, 15000);
	}
	else {
		console.log('no geeTest');
		await lookForAndSolveGee(url, page);
	}
}

async function getGeeTestResult(id: string, waitTime: number) {

	await wait(waitTime);

	const captchaApiSolvedUrl = `https://2captcha.com/res.php?key=${process.env.capatchaApiKey}&action=get&id=${id}&json=true`;

	const axiosResponse = await axios.get(captchaApiSolvedUrl);
	console.log('axiosResponse to complete solve', axiosResponse.data);

	if (axiosResponse.data.status === 0 && axiosResponse.data.request === 'CAPCHA_NOT_READY') {
		await getGeeTestResult(id, 1500);
	}
	else {
		return Promise.resolve();
	}

}

function wait(milliseconds: number) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}