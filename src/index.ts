import { Context, Schema, h } from 'koishi'

import { Draughts } from './class'

export const name = 'draughts'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

declare module 'koishi' {
  interface Tables {
    draughts_table: draughts_table
  }
}

export interface draughts_table {
  id: number
  fen: string
  participant:string[]
  owner:string
  turn:string
}

export function apply(ctx: Context) {

  ctx.model.extend('draughts_table', {
    id:'unsigned',
    fen: 'string',
    participant:'list',
    owner:'string',
    turn:'string'
  },{
    autoInc: true
  })

  ctx.command('draughts','国际象棋').alias('国际象棋')
    .usage(`使用教程 https://github.com/KIRA2ZERO/koishi-plugin-draughts`)

  ctx.command('draughts.create','创建国际象棋对局').alias('创建国际象棋对局')
  .option('target', '-t <target:string> 无需匹配直接指定对手id',{fallback:undefined})
  .action(async ({session,options}) => {
    const draughts = new Draughts(ctx,session)
    draughts.create(options)
  })

  ctx.command('draughts.remove id:posint','移除指定编号的国际象棋对局').alias('移除国际象棋对局')
  .action(async({session},id) =>{
    const draughts = new Draughts(ctx,session)
    draughts.remove(id)
  })

  ctx.command('draughts.show id:posint','展示指定编号的国际象棋对局').alias('展示国际象棋对局')
  .action(async({session},id) =>{
    const draughts = new Draughts(ctx,session)
    draughts.show(id)
  })
  
  ctx.command('draughts.clear','清除所有国际象棋对局',{authority:5}).alias('清除所有国际象棋对局')
  .example('清除所有国际象棋对局')
  .action(async({session}) => {
    const draughts = new Draughts(ctx,session)
    draughts.clear()
  })

  ctx.command('draughts.move id:posint','移动棋子').alias('移动棋子')
  .option('from', '-f <from:string> 移动的棋子起始位置')
  .option('to','-t <to:string> 移动的棋子终止位置')
  .example(`移动棋子 1 -f b2 -t b4`)
  .action(async ({session,options},id) => {
    const draughts = new Draughts(ctx,session)
    draughts.move(id,options)
  })
}