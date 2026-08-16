const express = require('express');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const https = require('https');

const app = express();
const PORT = 3000; // Порт вашего нового дашборда

// КОНФИГУРАЦИЯ ПОД ВАШ HAPROXY
const HAPROXY_URL = 'https://euroigor.ru:9000/proxy;csv'; 
const HAPROXY_AUTH = { username: 'spamigor', password: 'ugD6s2xz' };
const BACKEND_NAME = 'port_17581'; 
const POLL_INTERVAL = 5000; // Проверка каждые 5 секунд

// Хранилище статусов в оперативной памяти
let serversState = {};

// Создаем экземпляр axios с отключением проверки SSL (на случай самоподписанного сертификата)
const axiosInstance = axios.create({
    auth: HAPROXY_AUTH,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Функция отправки оповещения
async function sendNotification(serverName, oldStatus, newStatus) {
    const message = `⚠️ Сервер [${serverName}] изменил статус с ${oldStatus} на ${newStatus}!`;
    console.log(`[ALERT] ${message}`);
    
    // СЮДА МОЖНО ВСТАВИТЬ ОТПРАВКУ В ТЕЛЕГРАМ / СЛЭК / EMAIL
}

// Функция PULL-опроса
async function pollHAProxy() {
    try {
        const response = await axiosInstance.get(HAPROXY_URL);
        
        // Парсим CSV данные
        const records = parse(response.data, {
            comment: '#',
            skip_empty_lines: true
        });

        records.forEach(row => {
            const pxname = row[0];  // Имя секции (port_17581)
            const svname = row[1];  // Имя сервера (client_main / client_backup)
            const status = row[17]; // Статус (UP / DOWN)

            // Фильтруем только нужные серверы, исключая строки BACKEND и FRONTEND
            if (pxname === BACKEND_NAME && svname !== 'BACKEND' && svname !== 'FRONTEND') {
                const oldStatus = serversState[svname];

                // Если статус изменился — триггерим алерт
                if (oldStatus && oldStatus !== status) {
                    sendNotification(svname, oldStatus, status);
                }

                // Обновляем состояние
                serversState[svname] = status;
            }
        });

    } catch (error) {
        console.error('Ошибка опроса HAProxy:', error.message);
    }
}

// Запуск фонового мониторинга
setInterval(pollHAProxy, POLL_INTERVAL);
pollHAProxy();

// HTML Дашборд для другого человека
app.get('/', (req, res) => {
    let rows = '';
    for (const [server, status] of Object.entries(serversState)) {
        const color = status === 'UP' ? '#2ecc71' : '#e74c3c';
        rows += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: 500;">${server}</td>
                <td style="padding: 12px;"><span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${status}</span></td>
            </tr>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Мониторинг Серверов</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 40px; display: flex; justify-content: center; }
                .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 400px; }
                h2 { margin-top: 0; color: #2f3640; font-size: 20px; border-bottom: 2px solid #f5f6fa; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Статус серверов (Порт 17581)</h2>
                <table>
                    ${rows || '<tr><td style="padding:12px; color:#7f8c8d;">Получение данных...</td></tr>'}
                </table>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Дашборд успешно запущен на порту ${PORT}`);
});
