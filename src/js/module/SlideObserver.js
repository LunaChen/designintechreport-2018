import 'cross-fetch/polyfill'
import MutationObserver from 'mutation-observer'

import createTwitterWidget from './createTwitterWidget'
import drawGoogleChart from './drawGoogleChart'

export default class SlideObserver {
  constructor (element, index) {
    this.element = element
    this.index = index
    this.mounted = false
    this.visible = false
    this.init()
  }

  async init () {
    this.startObservingVisibility()
    await this.waitForElementToUnmount()
    this.stopObservingVisibility()
    if (this.mounted) {
      this.slideDidUnmount()
    }
  }

  startObservingVisibility() {
    if (this.element.classList.contains('remark-visible')) {
      this.visible = true
      this.slideDidMount()
      this.slideDidAppear()
    }
    const observer = new MutationObserver(mutations => {
      mutations.some(mutation => {
        if (mutation.attributeName !== 'class') {
          return
        }
        const visible = this.element.classList.contains('remark-visible')
        if (visible !== this.visible) {
          if (!this.mounted) {
            this.mounted = true
            this.slideDidMount()
          }
          this.visible = visible
          if (visible) {
            this.slideDidAppear()
          } else {
            this.slideDidDisappear()
          }
        }
      })
    })
    observer.observe(this.element, {
      attributes: true
    })
    this.visibilityObserver = observer
  }

  stopObservingVisibility() {
    this.visibilityObserver.disconnect()
  }

  waitForElementToUnmount () {
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(mutations => {
        mutations.some(mutation => {
          const removedNodes = Array.from(mutation.removedNodes)
          if (removedNodes.includes(this.element)) {
            resolve()
            return true
          }
          return false
        })
      })
      observer.observe(this.element.parentElement, {
        childList: true
      })
    })
  }

  slideDidMount() {
    this.querySelectorAll('a').forEach(this.processAnchor)
    this.querySelectorAll('img').forEach(this.processImage)
    this.querySelectorAll('audio, video').forEach(this.processAudioVideo)
    this.querySelectorAll('.iframe').forEach(this.processIFrame)
    this.querySelectorAll('.chart').forEach(this.processChart)
    this.querySelectorAll('.tweet').forEach(this.processTweet)
  }

  slideDidUnmount() {}

  slideDidAppear() {}

  slideDidDisappear() {}

  querySelectorAll (...args) {
    return Array.from(this.element.querySelectorAll(...args))
  }

  processAnchor (element) {
    const href = element.getAttribute('href')
    if (/^https?:/.test(href)) {
      element.setAttribute('target', '_blank')
    }
  }

  processImage (element) {
    const src = element.getAttribute('data-src')
    element.setAttribute('src', src)
    element.removeAttribute('data-src')
  }

  processAudioVideo (element) {
    const source = element.firstElementChild
    const src = source.getAttribute('data-src')
    source.setAttribute('src', src)
    source.removeAttribute('data-src')
    element.load()
  }

  processIFrame (element) {
    const iframe = element.firstElementChild
    const src = iframe.getAttribute('data-src')
    iframe.setAttribute('src', src)
    iframe.removeAttribute('data-src')
    const callback = event => {
      iframe.removeEventListener('load', callback, false)
      element.classList.add('loaded')
    }
    iframe.addEventListener('load', callback, false)
  }

  processChart (element) {
    const type = element.getAttribute('data-type')
    const src = element.getAttribute('data-src')
    window.fetch(src).then(response => {
      return response.json()
    }).then(({ data, options }) => {
      drawGoogleChart(element, type, data, options)
    }).catch(error => {
      throw error
    })
  }

  processTweet (element) {
    const tweetId = element.getAttribute('data-tweet-id')
    createTwitterWidget(tweetId, element)
  }
}
