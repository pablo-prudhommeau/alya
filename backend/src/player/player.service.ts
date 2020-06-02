import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import * as log4js from 'log4js';
import {Logger} from 'log4js';
import {Observable, Subject} from 'rxjs';
import {InsertResult, Repository} from 'typeorm';
import {ConfigService} from '../config/config.service';
import {GbxPlayer} from '../gbx/gbx-player';
import {GbxPlayerChat} from '../gbx/gbx-player-chat';
import {GbxPlayerInfo} from '../gbx/gbx-player-info';
import {GbxService} from '../gbx/gbx.service';
import {Message} from '../message/message.entity';
import {MessageService} from '../message/message.service';
import {TelegramService} from '../telegram/telegram.service';
import {Player} from './player.entity';

@Injectable()
export class PlayerService {

    public readonly playerMessageSubject: Subject<Message> = new Subject();

    private logger: Logger = log4js.getLogger();

    constructor(
            private readonly gbxService: GbxService,
            private readonly messageService: MessageService,
            private readonly configService: ConfigService,
            @InjectRepository(Player) private readonly playerRepository: Repository<Player>
    ) {
        GbxService.playerChatSubject.subscribe(async (gbxPlayerChat: GbxPlayerChat) => {
            if (gbxPlayerChat.PlayerUid === '0') {
                return;
            }
            const player: Player = await this.playerRepository.findOne({
                where: {
                    login: gbxPlayerChat.Login
                }
            });
            if (player === undefined) {
                return;
            }
            const message = new Message();
            message.player = player;
            message.message = gbxPlayerChat.Text;

            const messageInsertResult: InsertResult = await this.messageService.insert(message);
            message.messageId = messageInsertResult.identifiers[0].messageId;

            this.playerMessageSubject.next(message);
        });
    }

    subscribeToPlayerConnection(): Observable<Player> {
        return new Observable<Player>(observer => {
            GbxService.playerConnectionSubject.subscribe(async (gbxPlayer: GbxPlayer) => {
                const player: Player = await this.playerRepository.findOne({
                    where: {
                        login: gbxPlayer.Login
                    }
                });
                if (player !== undefined) {
                    observer.next(player);
                } else {
                    this.logger.error('Unknown player [' + gbxPlayer + ']');
                }
            });
        });
    }

    subscribeToPlayerDisconnection(): Observable<Player> {
        return new Observable<Player>(observer => {
            GbxService.playerDisconnectionSubject.subscribe(async (gbxPlayer: GbxPlayer) => {
                const player: Player = await this.playerRepository.findOne({
                    where: {
                        login: gbxPlayer.Login
                    }
                });
                if (player !== undefined) {
                    observer.next(player);
                } else {
                    this.logger.error('Unknown player [' + gbxPlayer + ']');
                }
                observer.next(player);
            });
        });
    }

    subscribeToPlayerMessage(): Observable<Message> {
        return new Observable<Message>(observer => {
            this.playerMessageSubject.subscribe((message: Message) => {
                observer.next(message);
            });
        });
    }

    getPlayerList(): Promise<Player[]> {
        return new Promise<Player[]>(async resolve => {
            const playerList = await this.playerRepository.find({
                order: {
                    lastVisit: 'DESC'
                }
            });
            resolve(playerList);
        });
    }

    getOnlinePlayerList(): Promise<Player[]> {
        return new Promise<Player[]>(async resolve => {
            const playerList: Player[] = [];
            const gbxPlayerInfoList: GbxPlayerInfo[] = await this.gbxService.getPlayerList();
            for (const gbxPlayer of gbxPlayerInfoList) {
                const player: Player = await this.playerRepository.findOne({
                    where: {
                        login: gbxPlayer.Login
                    }
                });
                playerList.push(player);
            }
            resolve(playerList);
        });
    }

}
