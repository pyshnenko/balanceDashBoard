import path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 
import express, { Request, Response } from 'express';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import https from 'https';
import cors from 'cors';

const app = express();

// Читаем порт из .env или используем 3000 по умолчанию
const PORT: number = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
console.log('Проверка .env:', {
  PORT: process.env.PORT,
  HAPROXY_URL: process.env.HAPROXY_URL,
  HAPROXY_USER: process.env.HAPROXY_USER ? 'Задан' : 'НЕ ЗАДАН'
});
// --- КОНФИГУРАЦИЯ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ---
const HAPROXY_URL: string = process.env.HAPROXY_URL || 'https://euroigor.ru';
const HAPROXY_AUTH = { 
  username: process.env.HAPROXY_USER || '', 
  password: process.env.HAPROXY_PASS || '' 
};

const BACKEND_NAME: string = 'port_17581';
const POLL_INTERVAL: number = 5000;

// --- ТИПИЗАЦИЯ ---
export type ServerStatus = 'UP' | 'DOWN' | string;

interface ServersState {
  [serverName: string]: ServerStatus;
}

export interface ServerInfo {
  name: string;
  status: ServerStatus;
}

// Хранилище статусов в оперативной памяти
let serversState: ServersState = {};

// Создаем экземпляр axios с отключением проверки SSL (на случай самоподписанного сертификата)
const axiosInstance = axios.create({
    auth: HAPROXY_AUTH,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Функция отправки оповещения
// Измените эту функцию в вашем файле мониторинга:
async function sendNotification(serverName: string, oldStatus: ServerStatus, newStatus: ServerStatus): Promise<void> {
  // Назначаем эмодзи в зависимости от нового статуса
  const statusEmoji = newStatus === 'UP' ? '✅' : '🚨';
  
  // Формируем красивое текстовое сообщение для Телеграма
  const message = `${statusEmoji} <b>Сервер [${serverName}]</b> изменил статус:\n• Было: <code>${oldStatus}</code>\n• Стало: <b>${newStatus}</b>`;
  
  console.log(`[ALERT] Отправка уведомления: Сервер [${serverName}] ${oldStatus} -> ${newStatus}`);

  try {
    // Порт 4500, который мы выделили в коде бота app3.js
    // Если бот крутится на том же сервере, оставляем localhost
    const BOT_ALERT_URL = process.env.BOT_ALERT_URL || 'http://localhost:4500/alert';

    await axios.post(BOT_ALERT_URL, {
      message: message
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`[ALERT] Уведомление успешно доставлено в Телеграм-бот`);
  } catch (error: any) {
    console.error('[ALERT ERROR] Не удалось отправить уведомление в бот:', error.message);
  }
}

// Функция PULL-опроса
async function pollHAProxy(): Promise<void> {
  try {
    const response = await axiosInstance.get<string>(HAPROXY_URL);
    
    // Проверяем, не подсунул ли сервер XML/HTML вместо CSV
    if (typeof response.data === 'string' && (response.data.trim().startsWith('<?xml') || response.data.trim().startsWith('<html') || response.data.trim().startsWith('<!DOCTYPE'))) {
      console.error('[WARNING] HAProxy вернул XML/HTML вместо CSV. Проверьте правильность URL или учетных данных авторизации.');
      
      // ВРЕМЕННО ДОБАВЬТЕ ЭТУ СТРОКУ, ЧТОБЫ УВИДЕТЬ ТЕКСТ ОТВЕТА:
      console.log('--- НАЧАЛО ОТВЕТА СЕРВЕРА ---', response.data, '--- КОНЕЦ ОТВЕТА СЕРВЕРА ---');
      
      return; 
    }

    // Парсим CSV данные только если это не XML/HTML
    const records: string[][] = parse(response.data, { comment: '#', skip_empty_lines: true });

    records.forEach((row: string[]) => {
      const pxname = row[0];  // Имя секции (port_17581)
      const svname = row[1];  // Имя сервера (client_main / client_backup)
      const status = row[17]; // Статус (UP / DOWN)

      if (pxname === BACKEND_NAME && svname !== 'BACKEND' && svname !== 'FRONTEND') {
        const oldStatus = serversState[svname];

        if (oldStatus && oldStatus !== status) {
          sendNotification(svname, oldStatus, status);
        }

        serversState[svname] = status;
      }
    });
  } catch (error: any) {
    console.error('Ошибка опроса HAProxy:', error.message);
  }
}

// Запуск фонового мониторинга
setInterval(pollHAProxy, POLL_INTERVAL);
pollHAProxy();

// --- ЭНДПОИНТЫ API ---

// Отдаем состояние серверов в формате JSON
app.get('/stat/api/status', (req: Request, res: Response<ServerInfo[]>) => {
  const data: ServerInfo[] = Object.entries(serversState).map(([name, status]) => ({
    name,
    status
  }));
  res.json(data);
});

// --- ИНТЕГРАЦИЯ С ФРОНТЕНДОМ ---

// Путь к скомпилированному фронтенду (выходим из server/dist/ и идем в frontend/dist/)
const frontendPath = path.join(__dirname, '../../frontend/dist');

// Раздача статических файлов (js, css, картинки)
app.use(express.static(frontendPath));

// Любые другие запросы, которые не попали под `/api/`, перенаправляем на index.html фронтенда
app.get('/*splat', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- ЗАПУСК СЕРВЕРА ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================================`);
  console.log(` Сервер успешно запущен на порту ${PORT}`);
  console.log(` Мониторинг и UI доступны по адресу: http://localhost:${PORT}`);
  console.log(`==================================================================`);
});
