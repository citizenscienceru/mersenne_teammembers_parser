/*
    Парсер данных с сайта https://www.mersenne.org/tmembers/
*/


const fs = require('fs');

const puppeteer = require('puppeteer');
const alasql = require('alasql');
const YAML = require('yaml');

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

const genNews = async (newsText) => { // функция генерации новостей
    // генерация на сайт
    let newsYML = fs.readFileSync('../../source/_data/news.yml', 'utf8');
    let news =YAML.parse(newsYML); // массив с новостями в виде json
    // формирование новой новости
    let newNews = {};
    newNews.type = "Новость";
    newNews.pub_date = mysqlCurrentDateTime() + "";
    newNews.title = "Новый участник команды!"
    newNews.source_url = "";
    newNews.author = "Робот";
    newNews.description = newsText;

    news.unshift(newNews);
    fs.writeFileSync('../../source/_data/news.yml', YAML.stringify(news), (err) => {
        if (err) throw err;
    });
    process.exit(0);

    // генерация в твиттер
    // генерация в TG канал

};
//-------------------------------------------------------------------


(async () => {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.goto('https://www.mersenne.org');


    const USERNAME_SELECTOR = 'input[name="user_login"]';
    const PASSWORD_SELECTOR = 'input[name="user_password"]';
    const BUTTON_SELECTOR = '#submitbutton';

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type('citizenscience_ru');

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type('yjdfz2410');

    await page.click(BUTTON_SELECTOR);

    // --- страница с участниками
    await page.goto('https://www.mersenne.org/tmembers/');
    const result = await page.evaluate(() => {
        const rows = document.querySelectorAll('#report1 tr');
        return Array.from(rows, row => {
            const columns = row.querySelectorAll('td');
            return Array.from(columns, column => column.innerText);
        });
    });

    let oldData = require('./data.json');
    let userDataNew = []; // 
    await asyncForEach(result, (row) => {
        let cellCount = 0;
        let userData = {};
        row.forEach(cell => {
            cellCount++;
            if (cellCount === 1) {
                userData.name = cell
            } else if (cellCount === 2) {
                userData.date = cell;
            }
        })
        // ищем данные 
        const res = alasql('select date from ? where name like ?', [oldData, userData.name]);
        if (res[0]) { // есть такой пользователь в команде
        } else {
            if (userData.name) {
                userDataNew.push(userData);
                oldData.push(userData);
            }
        }
    })

    // Проверка, что есть новые
    if (userDataNew.length > 0) {
        await fs.writeFileSync('./data.json', JSON.stringify(oldData));
        if (userDataNew.length === 1) {
            genNews(`Приветсвуем нового участника команды citizenscience.ru в поиске больших чисел Мерсена, ${userDataNew[0].name}!`)
        } else {
            let newsText = '`Поприветсвуем новых участников команды citizenscience.ru в поиске больших чисел Мерсена: '
            await asyncForEach(userDataNew, (newUser) => {
                newsText += newUser.name + '<br>'
            });
            newsText += '!'
            genNews(newsText);
        }
    } else {
        process.exit(0);
    }
    
})();
//-------------------------------------------------------------------
function mysqlCurrentDateTime() {
    return new Date().toMysqlFormat();
};

function twoDigits(d) {
    if(0 <= d && d < 10) { return '0' + d.toString(); }
    if(-10 < d && d < 0) { return '-0' + (-1*d).toString(); }
    return d.toString();
};

Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + '-' + twoDigits(1 + this.getUTCMonth()) + '-' + twoDigits(this.getUTCDate()) + ' ' + twoDigits(this.getUTCHours()) + ':' + twoDigits(this.getUTCMinutes()) + ':' + twoDigits(this.getUTCSeconds());
};
  