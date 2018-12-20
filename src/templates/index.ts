import { MarpitOptions, MarpitRenderResult, Element } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import promisify from 'util.promisify'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'
import notePug from './note/note.pug'
import noteScss from './note/note.scss'

const readFile = promisify(fs.readFile)

export interface TemplateOptions {
  base?: string
  lang: string
  notifyWS?: string
  readyScript?: string
  renderer: (tplOpts: MarpitOptions) => MarpitRenderResult
  [prop: string]: any
}

export interface TemplateResult {
  rendered: MarpitRenderResult
  result: string
}

export type Template = (locals: TemplateOptions) => Promise<TemplateResult>

export const bare: Template = async opts => {
  const rendered = opts.renderer({
    container: [],
    inlineSVG: true,
    slideContainer: [],
  })

  return {
    rendered,
    result: barePug({
      ...opts,
      ...rendered,
      bare: { css: bareScss },
      watchJs: await watchJs(opts.notifyWS),
    }),
  }
}

export const bespoke: Template = async opts => {
  const rendered = opts.renderer({
    container: new Element('article', { id: 'presentation' }),
    inlineSVG: true,
    slideContainer: [],
  })

  return {
    rendered,
    result: bespokePug({
      ...opts,
      ...rendered,
      bespoke: {
        css: bespokeScss,
        js: await libJs('bespoke.js'),
        progress: false,
      },
      watchJs: await watchJs(opts.notifyWS),
    }),
  }
}

export const note: Template = async opts => {
  const rendered = opts.renderer({
    container: [],
    inlineSVG: true,
    printable: false,
    slideContainer: new Element('div', { class: 'marp-cli-note-slide' }),
  })

  // Split slide HTML into array
  const slides = rendered.html
    .slice(33, -6)
    .split('</div><div class="marp-cli-note-slide">')
    .map(svg => `<div class="marp-cli-note-slide">${svg}</div>`)

  return {
    rendered,
    result: notePug({
      ...opts,
      ...rendered,
      slides,
      note: { css: noteScss },
      watchJs: await watchJs(opts.notifyWS),
    }),
  }
}

export async function libJs(fn: string) {
  return (await readFile(path.resolve(__dirname, fn))).toString()
}

export async function watchJs(notifyWS?: string) {
  if (notifyWS === undefined) return false

  const watchJs = await libJs('watch.js')
  return `window.__marpCliWatchWS=${JSON.stringify(notifyWS)};${watchJs}`
}

const templates: { [name: string]: Template } = { bare, bespoke, note }

export default templates
