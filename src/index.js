/* eslint-disable import/extensions, import/no-unresolved */
import { UICorePlugin, Events, Styler, template } from 'clappr'
import $ from 'clappr-zepto/zepto'
/* eslint-enable import/extensions, import/no-unresolved */

import setupInteractions from './interactions'

// assets
import detachMediaControlButton from './assets/detach-media-control-button.html'
import detachPlaceholder from './assets/detach-placeholder.html'
import detachIcon from './assets/detach-icon.svg'
import detachStyle from './assets/detach.css'

const DETACH_STYLE_TAG = Styler.getStyleFor(detachStyle)

const DEFAULT_POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='

const NOOP = () => {}

const DEFAULT_OPTIONS = {
  orientation: 'bottom-left',
  opacity: 1,
  width: 320,
  height: 180,
  detachOnStart: true, // TODO set false when done
  onAttach: NOOP,
  onDetach: NOOP,
}

const iconMarkup = template(detachIcon)()

const mediaControlButtonMarkup = template(detachMediaControlButton)({
  icon: iconMarkup,
})

const placeholderMarkup = (poster = DEFAULT_POSTER) => template(detachPlaceholder)({
  icon: iconMarkup,
  backgroundImage: poster,
})

const orientationOptions = (orientation) => {
  const options = {}

  orientation.split('-').forEach((side) => {
    if (side === 'left') { options.left = 10 }
    if (side === 'right') { options.right = 10 }
    if (side === 'bottom') {
      options.transform = 'translate(0, -130px)'
      options.bottom = -100
    }
    if (side === 'top') {
      options.transform = 'translate(0, 130px)'
      options.top = -100
    }
  })

  return options
}

export default class ClapprDetachPlugin extends UICorePlugin {
  /* eslint-disable class-methods-use-this */
  // clappr uses this - to find the plugin by name
  get name() {
    return 'detach'
  }

  // clappr uses this - to add this class to the player's root element
  get className() {
    return 'clappr-detach'
  }
  /* eslint-enable class-methods-use-this */

  constructor(core) {
    super(core)

    this.initOptions(this.core.options.detachOptions)

    if (core.ready) {
      this.onCoreReady()
    }
  }

  get currentContainer() { return this.core.getCurrentContainer() }

  /*
    ---------------------------------------------------------------------------
    elements
    ---------------------------------------------------------------------------
  */
  initElements() {
    this.initMiniPlayerContainerElement()
    this.initMainPlayerContainerElement()
    this.initMainPlayerContainerPlaceholderElement()
  }

  /*
    $player is the player itself, that gets moved between the $mainPlayerContainer and $miniPlayerContainer.
    We don't instantiate $player, Clappr does
  */
  get $player() { return this.core.$el }

  /*
    $miniPlayerContainer is the element we move the $player to when it is detached
  */
  initMiniPlayerContainerElement() {
    if (this.$miniPlayerContainer) {
      return
    }

    const el = $('<div>')
    el.addClass('clappr-detach__wrapper')
    $('body').append(el)

    this.$miniPlayerContainer = el
  }

  /*
    $mainPlayerContainer is the element where the $player was originaly put in.
    When we attach back the player, we move it to $mainPlayerContainer
  */
  initMainPlayerContainerElement() {
    // When $player is mounted in the DOM (after Events.CORE_READY), we keep a reference to the parent.
    // Since $player may be removed later, it may not have a parent later, so we keep the reference.
    if (this.$mainPlayerContainer || !this.$player.parent()[0]) {
      return
    }

    this.$mainPlayerContainer = this.$player.parent()
  }

  /*
    $mainPlayerPlaceholder is the element we put a placeholder in when we detach the player to the $miniPlayerContainer
  */
  get $mainPlayerPlaceholder() { return this.$el }

  initMainPlayerContainerPlaceholderElement() {
    this.$mainPlayerPlaceholder.empty()

    // TODO rafael - colocar esses eventos?
    // this.$mainPlayerPlaceholder.find('.clappr-detach__placeholder-icon').off('click', this.toggleDetach)
    // this.$mainPlayerPlaceholder.html(placeholderMarkup(this.core.options.poster))
    // this.$mainPlayerPlaceholder.find('.clappr-detach__placeholder-icon').on('click', this.toggleDetach)
    this.$mainPlayerPlaceholder.append(placeholderMarkup(this.core.options.poster))

    this.$mainPlayerPlaceholder.append(DETACH_STYLE_TAG)
  }

  /*
    ---------------------------------------------------------------------------
    wrapper
    ---------------------------------------------------------------------------
  */
  moveToMiniPlayerContainer = () => {
    this.$miniPlayerContainer.append(this.$player[0])
  }

  moveToMainPlayerContainer = () => {
    this.$mainPlayerContainer.append(this.$player[0])
  }

  /*
    ---------------------------------------------------------------------------
    events
    ---------------------------------------------------------------------------
  */
  bindEvents() {
    this.listenTo(this.core, Events.CORE_OPTIONS_CHANGE, this.onOptionsChange)
    this.listenTo(this.core, Events.CORE_READY, this.onCoreReady)
    this.listenTo(this.core, Events.CORE_FULLSCREEN, this.onCoreFullScreen)
    this.listenTo(this.mediaControl, Events.MEDIACONTROL_RENDERED, this.onMediaControlRendered)
  }

  onCoreReady() {
    this.initElements()
    this.listenTo(this.currentContainer, Events.CONTAINER_PLAY, this.onContainerPlay)

    // clean up any element that might conflict with the placeholder
    this.$mainPlayerContainer.find(this.className).remove()
    this.$mainPlayerContainer.append(this.$mainPlayerPlaceholder[0])
  }

  onContainerPlay() {
    if (!this.alreadyDetachedOnStart && this.options.detachOnStart) {
      this.alreadyDetachedOnStart = true
      this.detach()
    }
  }

  /*
    ---------------------------------------------------------------------------
    options
    ---------------------------------------------------------------------------
  */
  initOptions(customOptions) {
    this.opts = {
      ...DEFAULT_OPTIONS,
      ...customOptions,
    }
  }

  get options() {
    return this.opts
  }

  onOptionsChange() {
    this.initElements()
  }

  /*
    ---------------------------------------------------------------------------
    fullscreen
    ---------------------------------------------------------------------------
  */
  onCoreFullScreen(goingToFullScreen) {
    this.mediaControlDetachButton.toggle(!goingToFullScreen)

    if (!goingToFullScreen) {
      if (this.isDetached) {
        // FIXME
        setTimeout(() => {
          this.core.resize({
            width: this.options.width,
            height: this.options.height,
          })
        }, 10)
      } else {
        this.$player.attr('style', this.mainPlayerOriginalStyle)
      }
    }
  }

  /*
    ---------------------------------------------------------------------------
    media control
    ---------------------------------------------------------------------------
  */
  get clickToPausePlugin() { return this.core.containers[0].getPlugin('click_to_pause') }
  get mediaControl() { return this.core.mediaControl }
  get mediaControlDetachButton() { return this.mediaControl.$el.find('.clappr-detach__media-control-button') }
  get mediaControlRightPanel() { return this.mediaControl.$el.find('.media-control-right-panel') }
  get mediaControlSeekBar() { return this.mediaControl.$el.find('.media-control-center-panel') }

  onMediaControlRendered() {
    this.mediaControl.setKeepVisible(true)
    this.mediaControlRightPanel.append(mediaControlButtonMarkup)
    this.mediaControlDetachButton.on('click', this.toggleDetach)
  }

  enablePauseClick() {
    this.clickToPausePlugin.enable()
  }

  disablePauseClick() {
    this.clickToPausePlugin.disable()
  }

  /*
    ---------------------------------------------------------------------------
    main player
    ---------------------------------------------------------------------------
  */
  hidePlayer() {
    this.$player.css({
      opacity: 0,
    })
  }

  showPlayer() {
    this.$player.css({
      height: '100%',
      width: '100%',
      opacity: 1,
    })
  }

  /*
    ---------------------------------------------------------------------------
    mini player
    ---------------------------------------------------------------------------
  */
  get miniPlayerOptions() {
    const { orientation, detachOnStart, ...options } = this.options
    return { ...options, ...orientationOptions(orientation) }
  }

  enableMiniPlayer() {
    this.mediaControlSeekBar.hide()
    this.moveToMiniPlayerContainer()

    this.showPlayer()
    this.$miniPlayerContainer.css(this.miniPlayerOptions)
    this.resetMiniPlayerPosition()
    // FIXME
    setTimeout(() => {
      this.$miniPlayerContainer.css(orientationOptions(this.options.orientation))
    }, 10)
  }

  disableMiniPlayer() {
    this.mediaControlSeekBar.show()
    this.moveToMainPlayerContainer()
    this.resetMiniPlayerPosition()
    this.$player.attr('style', this.mainPlayerOriginalStyle)
  }

  resetMiniPlayerPosition() {
    this.$miniPlayerContainer.css({
      transform: 'translate(0, 0)',
    })
  }

  /*
    ---------------------------------------------------------------------------
    placeholder
    ---------------------------------------------------------------------------
  */
  showPlaceholder() {
    this.$mainPlayerPlaceholder.attr('style', this.mainPlayerOriginalStyle)
    this.$mainPlayerPlaceholder.addClass('clappr-detach--visible')
  }

  hidePlaceholder() {
    this.$mainPlayerPlaceholder.removeClass('clappr-detach--visible')
  }

  /*
    ---------------------------------------------------------------------------
    drag
    ---------------------------------------------------------------------------
  */
  enablePlayerDrag() {
    this.disablePauseClick()
    setupInteractions(this.$miniPlayerContainer[0], {
      drag: true,
      drop: {
        dropAreaElement: this.$mainPlayerPlaceholder[0],
        onDrop: this.attach,
      },
    })
  }

  disablePlayerDrag() {
    this.enablePauseClick()
  }

  /*
    ---------------------------------------------------------------------------
    attach / detach
    ---------------------------------------------------------------------------
  */
  // clappr uses this
  getExternalInterface() {
    return {
      detach: this.detach,
      attach: this.attach,
    }
  }

  toggleDetach = () => {
    if (this.isDetached) {
      this.attach()
    } else {
      this.detach()
    }
  }

  attach = () => {
    if (!this.isDetached) {
      return
    }
    this.isDetached = false

    const isPlaying = this.currentContainer.isPlaying()

    this.disablePlayerDrag()
    this.hidePlaceholder()
    this.disableMiniPlayer()

    if (isPlaying) {
      this.currentContainer.play()
    }

    this.options.onAttach()
  }

  detach = () => {
    if (this.isDetached) {
      return
    }
    this.isDetached = true

    const isPlaying = this.currentContainer.isPlaying()

    if (isPlaying) {
      this.currentContainer.pause()
    }

    this.mainPlayerOriginalStyle = this.$player.attr('style')

    this.hidePlayer()
    this.enablePlayerDrag()
    this.enableMiniPlayer()
    this.showPlaceholder()

    if (isPlaying) {
      this.currentContainer.play()
    }

    this.options.onDetach()
  }
}
