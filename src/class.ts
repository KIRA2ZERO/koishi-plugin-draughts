import { Chess } from 'chess.ts'

import { Context, h } from 'koishi'

type ChessDict<T> = { 
    [key: string]: T;
  };
  
const chessImageDict: ChessDict<string> = {
    pb: '♟︎',
    rb: '♜',
    nb: '♞',
    qb: '♛',
    kb: '♚',
    bb: '♝',
    pw: '♙',
    rw: '♖',
    nw: '♘',
    qw: '♕',
    kw: '♔',
    bw: '♗',
  };
  
interface Piece {
    type: string;
    color: string;
  }
  
function parseChessBoard(chessBoard, chessImageDict: ChessDict<string>): string {
    const board = chessBoard;
    let result = '';
    result += '  +-------------------------+\n';
    let count = board.length 
    for (let i = 0; i < board.length; i++) {
      result += `${count} | `;
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] === null) {
          if (i % 2 === 0) {
            if (j === 0) {
              result += ' \u25A0  ';
            } else if (j == 7) {
              result += ' \u25A1  ';
            } else {
              result += j % 2 === 0 ? '\u25A0  ' : '\u25A1  ';
            }
          } else {
            if (j === 0) {
              result += ' \u25A1  ';
            } else if (j == 7) {
              result += ' \u25A0  ';
            } else {
              result += j % 2 === 0 ? '\u25A1  ' : '\u25A0  ';
            }
          }
        } else {
          const piece = board[i][j] as Piece;
          result += `${chessImageDict[piece.type + piece.color]} `;
        }
      }
      result += `|\n`;
      count -= 1
    }
    result += '+-------------------------+\n';
    result += '      a  b  c  d  e  f  g  h\n';
    return result;
  }
  
export class Draughts {
  
    // 属性
    ctx:Context
    session:any
  
    constructor(ctx:Context,session){
      this.ctx = ctx
      this.session = session
    }
  
    async create(options:any): Promise<void> {
      const session = this.session;
      const ctx = this.ctx;
      const gameOwner = session.userId;
      const gameParticipants = [gameOwner];
    
      if (options.target) {
        gameParticipants.push(options.target);
        createNewGame(gameOwner, gameParticipants);
      } else {
        session.send(`等待另一位玩家加入对局\n请回复:【参与对局】`);
        ctx.middleware(async (session, next) => {
          if (
            session.content === `参与对局` &&
            gameParticipants.length === 1 &&
            session.userId !== gameOwner
          ) {
            gameParticipants.push(session.userId);
            createNewGame(gameOwner, gameParticipants);
          } else {
            return next();
          }
        });
      }
    
      async function createNewGame(gameOwner, gameParticipants) {
        const chess = new Chess(
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        );
        ctx.database.create('draughts_table', {
          fen: chess.fen(),
          participant: gameParticipants,
          owner: gameOwner,
          turn: gameOwner,
        });
        const rows = await ctx.database.get('draughts_table', {}, ['id']);
        const id = rows[rows.length - 1].id;
        session.send(
          h('quote', { id: session.messageId }) +
            `编号为${id}的国际象棋对局已创建,由${gameOwner}先手`
        );
        session.send(parseChessBoard(chess.board(), chessImageDict));
      }
  
    }
  
    async clear(){
      const session = this.session
      const ctx = this.ctx
      await ctx.database.remove('draughts_table', {})
      session.send(h('quote',{id:session.messageId}) +`所有国际象棋对局已被删除`)
    }
  
    async remove(id:string){
      const session = this.session
      const ctx = this.ctx
      await ctx.database.get('draughts_table',{id:[parseInt(id)]})
      .then(rows => {
        if(typeof(rows[0]) !== "undefined"){ return rows[0] }else{ session.send(h('quote',{id:session.messageId}) +`输入对局编号不存在`) }
      })
      .then(result => {
        if (result.owner !== session.userId){
          session.send(h('quote',{id:session.messageId}) +`非对局创建人无权删除`)
        }else{
          ctx.database.remove('draughts_table', {id:[parseInt(id)]})
          session.send(h('quote',{id:session.messageId}) +`编号为${id}的国际象棋对局已删除`)
        }
      })
    }
  
    async show(id:string){
      const session = this.session
      const ctx = this.ctx
      await ctx.database.get('draughts_table',{id:[parseInt(id)]})
      .then(rows => {
        if(typeof(rows[0]) !== "undefined"){ return rows[0] }else{ session.send(h('quote',{id:session.messageId}) +`输入对局编号不存在`) }
      })
      .then(result => {
        const fen = result.fen
        const chess = new Chess(fen)
        session.send(parseChessBoard(chess.board(),chessImageDict))
      })
    }
    
    async move(id:string,options:any):Promise<void>{
      const session = this.session
      const ctx = this.ctx
      const {from,to} = options;
      await ctx.database.get('draughts_table',{id:[parseInt(id)]})
      .then(rows => {
        if(typeof(rows[0]) === "undefined"){
          session.send(h('quote',{id:session.messageId}) + `对局编号【${id}】不存在`) 
          return
        }else if(rows[0].participant.indexOf(session.userId) === -1){
          return
        }else if(session.userId !== rows[0].turn){
          session.send(h('quote',{id:session.messageId}) + `现在是对手的回合`)
          return 
        }
        else{
          const turn = rows[0].participant[1-rows[0].participant.indexOf(session.userId)]
          const fen = rows[0].fen
          const chess = new Chess(fen)
          if(chess.move({from:from,to:to}) === null){
            session.send(h('quote',{id:session.messageId}) + `非法移动`)
            return
          }
          if(chess.gameOver()){
            session.send(`${session.userId}获胜`)
            ctx.database.remove('draughts_table', {id:[parseInt(id)]})
            session.send(parseChessBoard(chess.board(),chessImageDict))
            return
          }
          session.send(parseChessBoard(chess.board(),chessImageDict))
          ctx.database.set('draughts_table',{id:[parseInt(id)]},{fen:chess.fen(),turn:turn})
        }
      })
    }
  
  }