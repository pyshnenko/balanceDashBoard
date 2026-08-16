import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
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
async function sendNotification(serverName: string, oldStatus: ServerStatus, newStatus: ServerStatus): Promise<void> {
  const message = `⚠%EF%B8%8F Сервер [${serverName}] изменил статус с ${oldStatus} на ${newStatus}!`;
  console.log(`[ALERT] ${message}`);
  // СЮДА МОЖНО ВСТАВИТЬ ОТПРАВКУ В ТЕЛЕГРАМ / СЛЭК / EMAIL
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
app.get('/api/status', (req: Request, res: Response<ServerInfo[]>) => {
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
app.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(` Сервер успешно запущен на порту ${PORT}`);
  console.log(` Мониторинг и UI доступны по адресу: http://localhost:${PORT}`);
  console.log(`==================================================================`);
});
