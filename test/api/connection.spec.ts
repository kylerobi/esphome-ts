import {Connection, ReadData} from '../../src';
import {Server} from 'net';
import {BehaviorSubject} from 'rxjs';
import {MessageTypes} from '../../src/api/requestResponseMatching';
import {filter, take, tap} from 'rxjs/operators';

describe('Native API Connection', () => {

    let connection: Connection;
    let server: Server;
    let portNumber = 57777;

    beforeEach((done) => {
        server = new Server();
        portNumber++;
        server.listen(portNumber, () => {
            done();
        });
        connection = new Connection('localhost', portNumber);
    });

    it('should try to connect to the server', (done) => {
        server.on('connection', (socket) => {
            expect(true).toBe(true);
            done();
        });
        connection.open();
    }, 1000);

    it('should send data', (done) => {
        const exampleData = [0x25, 0x23, 0x56];
        server.on('connection', (socket) => {
            socket.on('data', ([zero, type, length, ...payload]) => {
                expect(zero).toBe(0);
                expect(type).toBe(MessageTypes.ConnectRequest);
                expect(length).toBe(exampleData.length);
                expect(payload).toEqual(exampleData);
                done();
            });
        });
        connection.open();
        connection.connected$.pipe(
            filter((connected) => connected),
            take(1),
            tap(() => connection.send(MessageTypes.ConnectRequest, new Uint8Array(exampleData))),
        ).subscribe();
    }, 1000);

    it('emits events when there is new data', (done) => {
        const exampleData = [0xDE, 0xAD, 0xBE, 0xEF];
        server.on('connection', (socket) => {
            socket.write(new Uint8Array([0x0, exampleData.length, MessageTypes.HelloResponse, ...exampleData]));
        });
        connection.open();
        connection.data$.pipe(
            take(1),
            tap(({type, payload}: ReadData) => {
                expect(type).toBe(MessageTypes.HelloResponse);
                expect([...payload]).toEqual(exampleData);
                done();
            }),
        ).subscribe();
    }, 2000);

    afterEach(() => {
        connection.close();
        server.close();
    });

});