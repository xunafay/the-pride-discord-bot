import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { discordClient } from '../discord';
import { TextChannel } from 'discord.js';

export function apiScaffold(): Express {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    if (req.headers.authorization !== `Key ${process.env.API_KEY}`) {
      return res.status(401).send('Inavlid api key');
    }
    next();
  });
  app.post('/clip', (req, res, next) => {
    const message = req.body.message;
    const username = req.body.username;
    const clip = req.body.clip;
    console.log(message);

    setTimeout(() => {
      (discordClient.guilds.resolve('406167664596090883')?.channels.resolve('440013287703445504') as TextChannel)
        .send(`${message == null ? '' : `${message} - `}clipped by ${username || '?'}\n${clip}`);
    }, 5000);

    res.sendStatus(204);
    next();
  });
  return app;
}
