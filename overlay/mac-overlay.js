#!/usr/bin/env osascript -l JavaScript
// mac-overlay.js — Holographic JXA Cocoa overlay notification for macOS
// Usage: osascript -l JavaScript mac-overlay.js <message> <color> <icon_path> <slot> <dismiss_seconds> [bundle_id] [ide_pid] [session_tty] [subtitle] [position] [notify_type] [all_screens] [screen_index]
//
// Creates a borderless, always-on-top overlay with holographic sci-fi aesthetic.
// Shows on all screens by default, or on a specific screen when screen_index is provided.
// Dismisses automatically after <dismiss_seconds> seconds (0 = persistent until clicked).
// If bundle_id is provided, clicking the overlay activates that app (click-to-focus).
// position: top-center (default), top-right, top-left, bottom-right, bottom-left, bottom-center

ObjC.import('Cocoa');
ObjC.import('QuartzCore');

function run(argv) {
  var message  = argv[0] || 'peon-ping';
  var color    = argv[1] || 'red';
  var iconPath = argv[2] || '';
  var slot     = parseInt(argv[3], 10) || 0;
  var dismiss  = argv[4] !== undefined ? parseFloat(argv[4]) : 4;
  if (isNaN(dismiss)) dismiss = 4;
  var bundleId   = argv[5] || '';
  var idePid     = parseInt(argv[6], 10) || 0;
  var sessionTty = argv[7] || '';
  var subtitle    = argv[8] || '';
  var position    = argv[9] || 'top-center';
  var allScreens  = argv[11] === 'true';
  var screenIdx   = (argv[12] !== undefined && argv[12] !== '') ? parseInt(argv[12], 10) : -1;

  // ── Holographic color scheme ──
  // Base glow color driven by category color, but always sci-fi
  var glowR, glowG, glowB;
  switch (color) {
    case 'blue':
      glowR = 0/255; glowG = 200/255; glowB = 255/255; break;
    case 'yellow':
      glowR = 0/255; glowG = 255/255; glowB = 200/255; break;
    case 'red':
      glowR = 0/255; glowG = 220/255; glowB = 255/255; break;
    default:
      glowR = 0/255; glowG = 220/255; glowB = 255/255; break;
  }

  var winWidth = 520, winHeight = 90;

  $.NSApplication.sharedApplication;
  $.NSApp.setActivationPolicy($.NSApplicationActivationPolicyAccessory);

  var persistent = dismiss <= 0;
  var dismissNotificationName = 'com.peonping.dismiss.' + slot;

  // ── Click handler (preserved from original) ──
  var clickHandler = null;
  if (bundleId || idePid > 0 || persistent) {
    ObjC.registerSubclass({
      name: 'PeonClickHandler',
      superclass: 'NSObject',
      methods: {
        'handleClick': {
          types: ['void', []],
          implementation: function() {
            if (sessionTty && bundleId === 'com.googlecode.iterm2') {
              var task = $.NSTask.alloc.init;
              task.setLaunchPath($('/usr/bin/osascript'));
              task.setArguments($(['-l', 'JavaScript', '-e',
                'var iTerm=Application("iTerm2");var ws=iTerm.windows();var f=0;' +
                'for(var w=0;w<ws.length&&!f;w++){var ts=ws[w].tabs();' +
                'for(var t=0;t<ts.length&&!f;t++){var ss=ts[t].sessions();' +
                'for(var s=0;s<ss.length&&!f;s++){try{if(ss[s].tty()==="' + sessionTty + '")' +
                '{ts[t].select();ss[s].select();var wn=ws[w].name();' +
                'var se=Application("System Events");var sw=se.processes["iTerm2"].windows();' +
                'for(var i=0;i<sw.length;i++){try{if(sw[i].name()===wn){sw[i].actions["AXRaise"].perform();break}}catch(e2){}}' +
                'ws[w].index=1;iTerm.activate();f=1}}catch(e){}}}}'
              ]));
              task.launch;
              task.waitUntilExit;
              $.NSDistributedNotificationCenter.defaultCenter.postNotificationNameObject($(dismissNotificationName), $.NSString.string);
              $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(
                0.05, $.NSApp, 'terminate:', null, false
              );
              return;
            }
            var activated = false;
            if (bundleId) {
              var ws = $.NSWorkspace.sharedWorkspace;
              var apps = ws.runningApplications;
              var count = apps.count;
              for (var i = 0; i < count; i++) {
                var app = apps.objectAtIndex(i);
                var bid = app.bundleIdentifier;
                if (!bid.isNil() && bid.js === bundleId) {
                  app.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
                  activated = true;
                  break;
                }
              }
            }
            if (!activated && idePid > 0) {
              var ideApp = $.NSRunningApplication.runningApplicationWithProcessIdentifier(idePid);
              if (ideApp && !ideApp.isNil()) {
                ideApp.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
              }
            }
            if (sessionTty && bundleId === 'com.googlecode.iterm2') {
              try {
                var task = $.NSTask.alloc.init;
                task.setLaunchPath($('/usr/bin/osascript'));
                task.setArguments($(['-l', 'JavaScript', '-e',
                  'var iTerm=Application("iTerm2");var ws=iTerm.windows();var f=0;' +
                  'for(var w=0;w<ws.length&&!f;w++){var ts=ws[w].tabs();' +
                  'for(var t=0;t<ts.length&&!f;t++){var ss=ts[t].sessions();' +
                  'for(var s=0;s<ss.length&&!f;s++){try{if(ss[s].tty()==="' + sessionTty + '")' +
                  '{ts[t].select();ss[s].select();ws[w].index=1;f=1}}catch(e){}}}}'
                ]));
                task.launch;
              } catch(e) {}
            }
            $.NSDistributedNotificationCenter.defaultCenter.postNotificationNameObject($(dismissNotificationName), $.NSString.string);
            $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(
              0.05, $.NSApp, 'terminate:', null, false
            );
          }
        }
      }
    });
    clickHandler = $.PeonClickHandler.alloc.init;
  }

  var screens = $.NSScreen.screens;
  var screenCount = screens.count;
  var windows = [];

  // Determine which screen(s) to display on
  var startIdx = 0, endIdx = screenCount;
  if (screenIdx >= 0 && screenIdx < screenCount) {
    startIdx = screenIdx;
    endIdx = screenIdx + 1;
  } else if (!allScreens) {
    var mouseLocation = $.NSEvent.mouseLocation;
    var focusedIdx = 0;
    for (var s = 0; s < screenCount; s++) {
      var scr = screens.objectAtIndex(s);
      var sf = scr.frame;
      if (mouseLocation.x >= sf.origin.x && mouseLocation.x <= sf.origin.x + sf.size.width &&
          mouseLocation.y >= sf.origin.y && mouseLocation.y <= sf.origin.y + sf.size.height) {
        focusedIdx = s; break;
      }
    }
    startIdx = focusedIdx;
    endIdx = focusedIdx + 1;
  }

  for (var i = startIdx; i < endIdx; i++) {
    var screen = screens.objectAtIndex(i);
    var visibleFrame = screen.visibleFrame;

    var margin = 10;
    var slotStep = winHeight + margin + 10; // extra spacing for glow
    var ySlotOffset = margin + slot * slotStep;
    var x, y;
    switch (position) {
      case 'top-right':
        x = visibleFrame.origin.x + visibleFrame.size.width - winWidth - margin;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset;
        break;
      case 'top-left':
        x = visibleFrame.origin.x + margin;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset;
        break;
      case 'bottom-right':
        x = visibleFrame.origin.x + visibleFrame.size.width - winWidth - margin;
        y = visibleFrame.origin.y + ySlotOffset;
        break;
      case 'bottom-left':
        x = visibleFrame.origin.x + margin;
        y = visibleFrame.origin.y + ySlotOffset;
        break;
      case 'bottom-center':
        x = visibleFrame.origin.x + (visibleFrame.size.width - winWidth) / 2;
        y = visibleFrame.origin.y + ySlotOffset;
        break;
      default: // top-center
        x = visibleFrame.origin.x + (visibleFrame.size.width - winWidth) / 2;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset;
    }
    var frame = $.NSMakeRect(x, y, winWidth, winHeight);

    // ── Window: transparent, borderless ──
    var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
      frame,
      $.NSWindowStyleMaskBorderless,
      $.NSBackingStoreBuffered,
      false
    );

    win.setBackgroundColor($.NSColor.clearColor);
    win.setOpaque(false);
    win.setAlphaValue(1.0);
    win.setLevel($.NSStatusWindowLevel);
    win.setHasShadow(false);

    if (!clickHandler) {
      win.setIgnoresMouseEvents(true);
    }

    win.setCollectionBehavior(
      $.NSWindowCollectionBehaviorCanJoinAllSpaces |
      $.NSWindowCollectionBehaviorStationary
    );

    var contentView = win.contentView;
    contentView.wantsLayer = true;
    contentView.layer.masksToBounds = false;

    // ── Outer glow container (the "hologram projection" shadow) ──
    var glowColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 1.0);
    var cgGlowColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.7);

    contentView.layer.shadowColor = cgGlowColor;
    contentView.layer.shadowOffset = $.CGSizeMake(0, 0);
    contentView.layer.shadowRadius = 18;
    contentView.layer.shadowOpacity = 1.0;

    // ── Pulsing outer glow animation ──
    var glowPulse = $.CABasicAnimation.animationWithKeyPath('shadowOpacity');
    glowPulse.fromValue = 1.0;
    glowPulse.toValue = 0.4;
    glowPulse.duration = 1.8;
    glowPulse.autoreverses = true;
    glowPulse.repeatCount = 1e30;
    glowPulse.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionEaseInEaseOut);
    contentView.layer.addAnimationForKey(glowPulse, 'glowPulse');

    // ── Main panel: dark translucent with vibrancy ──
    var panelInset = 4;
    var panelFrame = $.NSMakeRect(panelInset, panelInset, winWidth - panelInset * 2, winHeight - panelInset * 2);
    var panel = $.NSView.alloc.initWithFrame(panelFrame);
    panel.wantsLayer = true;

    // Dark semi-transparent base
    panel.layer.backgroundColor = $.CGColorCreateGenericRGB(0.02, 0.06, 0.10, 0.88);
    panel.layer.cornerRadius = 10;
    panel.layer.masksToBounds = true;

    // Glowing border
    panel.layer.borderWidth = 1.2;
    panel.layer.borderColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.6);

    contentView.addSubview(panel);

    // ── Inner edge glow line (top) ──
    var topGlow = $.NSView.alloc.initWithFrame($.NSMakeRect(0, panelFrame.size.height - 1.5, panelFrame.size.width, 1.5));
    topGlow.wantsLayer = true;
    topGlow.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.35);
    panel.addSubview(topGlow);

    // ── Inner edge glow line (bottom) ──
    var bottomGlow = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, 1));
    bottomGlow.wantsLayer = true;
    bottomGlow.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.2);
    panel.addSubview(bottomGlow);

    // ── Scanline overlay (horizontal lines pattern) ──
    var scanlineContainer = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, panelFrame.size.height));
    scanlineContainer.wantsLayer = true;
    scanlineContainer.layer.masksToBounds = true;
    // Create thin scanlines every 3px
    for (var sl = 0; sl < panelFrame.size.height; sl += 3) {
      var scanline = $.CALayer.layer;
      scanline.frame = $.CGRectMake(0, sl, panelFrame.size.width, 1);
      scanline.backgroundColor = $.CGColorCreateGenericRGB(0, 0, 0, 0.15);
      scanlineContainer.layer.addSublayer(scanline);
    }
    panel.addSubview(scanlineContainer);

    // ── Sweeping scan beam ──
    var scanBeam = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, 3));
    scanBeam.wantsLayer = true;
    scanBeam.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.2);
    scanBeam.layer.shadowColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.8);
    scanBeam.layer.shadowOffset = $.CGSizeMake(0, 0);
    scanBeam.layer.shadowRadius = 6;
    scanBeam.layer.shadowOpacity = 1.0;
    scanBeam.layer.masksToBounds = false;
    panel.addSubview(scanBeam);

    // Animate scan beam sweeping upward
    var sweepAnim = $.CABasicAnimation.animationWithKeyPath('position.y');
    sweepAnim.fromValue = 0;
    sweepAnim.toValue = panelFrame.size.height;
    sweepAnim.duration = 2.5;
    sweepAnim.repeatCount = 1e30;
    sweepAnim.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionLinear);
    scanBeam.layer.addAnimationForKey(sweepAnim, 'sweep');

    // ── Corner brackets (tactical HUD feel) ──
    var bracketSize = 14;
    var bracketThick = 1.5;
    var bracketColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.5);
    var corners = [
      // [x, y, hW, hH, vW, vH]
      [0, panelFrame.size.height - bracketThick, bracketSize, bracketThick, bracketThick, bracketSize], // top-left
      [panelFrame.size.width - bracketSize, panelFrame.size.height - bracketThick, bracketSize, bracketThick, panelFrame.size.width - bracketThick, bracketSize], // top-right (v starts from right)
      [0, 0, bracketSize, bracketThick, bracketThick, bracketSize], // bottom-left
      [panelFrame.size.width - bracketSize, 0, bracketSize, bracketThick, panelFrame.size.width - bracketThick, bracketSize] // bottom-right
    ];
    for (var ci = 0; ci < corners.length; ci++) {
      var c = corners[ci];
      var hBar = $.CALayer.layer;
      hBar.frame = $.CGRectMake(c[0], c[1], c[2], c[3]);
      hBar.backgroundColor = bracketColor;
      panel.layer.addSublayer(hBar);

      var vBar = $.CALayer.layer;
      var vy = (ci < 2) ? panelFrame.size.height - c[5] : 0;
      var vx = (ci % 2 === 0) ? 0 : panelFrame.size.width - bracketThick;
      vBar.frame = $.CGRectMake(vx, vy, bracketThick, c[5]);
      vBar.backgroundColor = bracketColor;
      panel.layer.addSublayer(vBar);
    }

    // ── Icon with holographic circular frame ──
    var textX = 16, textWidth = panelFrame.size.width - 40;

    if (iconPath !== '' && $.NSFileManager.defaultManager.fileExistsAtPath(iconPath)) {
      var iconImage = $.NSImage.alloc.initWithContentsOfFile(iconPath);
      if (iconImage && !iconImage.isNil()) {
        var iconDiameter = 62;
        var iconPadding = 12;
        var iconCenterY = (panelFrame.size.height - iconDiameter) / 2;

        // Glow ring behind icon
        var ringSize = iconDiameter + 8;
        var ringView = $.NSView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding - 4, iconCenterY - 4, ringSize, ringSize)
        );
        ringView.wantsLayer = true;
        ringView.layer.cornerRadius = ringSize / 2;
        ringView.layer.borderWidth = 1.5;
        ringView.layer.borderColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.6);
        ringView.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.08);
        ringView.layer.shadowColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.9);
        ringView.layer.shadowOffset = $.CGSizeMake(0, 0);
        ringView.layer.shadowRadius = 10;
        ringView.layer.shadowOpacity = 0.8;
        ringView.layer.masksToBounds = false;
        panel.addSubview(ringView);

        // Pulsing ring glow
        var ringPulse = $.CABasicAnimation.animationWithKeyPath('shadowOpacity');
        ringPulse.fromValue = 0.8;
        ringPulse.toValue = 0.3;
        ringPulse.duration = 1.5;
        ringPulse.autoreverses = true;
        ringPulse.repeatCount = 1e30;
        ringPulse.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionEaseInEaseOut);
        ringView.layer.addAnimationForKey(ringPulse, 'ringPulse');

        // Icon image (circular clipped)
        var iconView = $.NSImageView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding, iconCenterY, iconDiameter, iconDiameter)
        );
        iconView.setImage(iconImage);
        iconView.setImageScaling($.NSImageScaleProportionallyUpOrDown);
        iconView.wantsLayer = true;
        iconView.layer.cornerRadius = iconDiameter / 2;
        iconView.layer.masksToBounds = true;
        iconView.layer.borderWidth = 0.5;
        iconView.layer.borderColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.3);
        panel.addSubview(iconView);

        // Holographic cyan tint overlay on icon
        var tintOverlay = $.NSView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding, iconCenterY, iconDiameter, iconDiameter)
        );
        tintOverlay.wantsLayer = true;
        tintOverlay.layer.cornerRadius = iconDiameter / 2;
        tintOverlay.layer.masksToBounds = true;
        tintOverlay.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.12);
        panel.addSubview(tintOverlay);

        textX = iconPadding + iconDiameter + 14;
        textWidth = panelFrame.size.width - textX - 20;
      }
    }

    // ── "INCOMING TRANSMISSION" micro-label ──
    var tagFont = $.NSFont.fontWithNameSize('Menlo-Bold', 8.5);
    if (!tagFont || tagFont.isNil()) tagFont = $.NSFont.boldSystemFontOfSize(8.5);
    var tagLabel = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, panelFrame.size.height - 22, textWidth, 12)
    );
    tagLabel.setStringValue($('◆ INCOMING TRANSMISSION'));
    tagLabel.setBezeled(false);
    tagLabel.setDrawsBackground(false);
    tagLabel.setEditable(false);
    tagLabel.setSelectable(false);
    tagLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 0.55));
    tagLabel.setFont(tagFont);
    tagLabel.setLineBreakMode($.NSLineBreakByTruncatingTail);
    tagLabel.cell.setWraps(false);
    panel.addSubview(tagLabel);

    // ── Message label — sci-fi monospace ──
    var font = $.NSFont.fontWithNameSize('Menlo-Bold', 15);
    if (!font || font.isNil()) font = $.NSFont.boldSystemFontOfSize(15);
    var textHeight = 22;
    var textY = (panelFrame.size.height - textHeight) / 2 - 2;
    var label = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, textY, textWidth, textHeight)
    );
    label.setStringValue($(message));
    label.setBezeled(false);
    label.setDrawsBackground(false);
    label.setEditable(false);
    label.setSelectable(false);
    label.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(0.85, 0.95, 1.0, 1.0));
    label.setFont(font);
    label.setLineBreakMode($.NSLineBreakByTruncatingTail);
    label.cell.setWraps(false);

    // Text glow via shadow
    var shadow = $.NSShadow.alloc.init;
    shadow.shadowColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 0.7);
    shadow.shadowOffset = $.NSMakeSize(0, 0);
    shadow.shadowBlurRadius = 8;
    label.shadow = shadow;

    panel.addSubview(label);

    // ── Status bar / frequency line at bottom ──
    var statusFont = $.NSFont.fontWithNameSize('Menlo', 9);
    if (!statusFont || statusFont.isNil()) statusFont = $.NSFont.systemFontOfSize(9);
    var statusLabel = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, 6, textWidth, 12)
    );
    var freq = '████░░ ' + Math.floor(Math.random() * 900 + 100) + '.' + Math.floor(Math.random() * 90 + 10) + ' MHz  ◈ GHOST PROTOCOL';
    statusLabel.setStringValue($(freq));
    statusLabel.setBezeled(false);
    statusLabel.setDrawsBackground(false);
    statusLabel.setEditable(false);
    statusLabel.setSelectable(false);
    statusLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 0.3));
    statusLabel.setFont(statusFont);
    statusLabel.setLineBreakMode($.NSLineBreakByTruncatingTail);
    statusLabel.cell.setWraps(false);
    panel.addSubview(statusLabel);

    // ── "click to focus" hint ──
    if (clickHandler) {
      var hintFont = $.NSFont.fontWithNameSize('Menlo', 9);
      if (!hintFont || hintFont.isNil()) hintFont = $.NSFont.systemFontOfSize(9);
      var hintLabel = $.NSTextField.alloc.initWithFrame(
        $.NSMakeRect(panelFrame.size.width - 130, 6, 120, 12)
      );
      var hintText = (bundleId || idePid > 0) ? '[ click to focus ]' : '[ click to dismiss ]';
      hintLabel.setStringValue($(hintText));
      hintLabel.setBezeled(false);
      hintLabel.setDrawsBackground(false);
      hintLabel.setEditable(false);
      hintLabel.setSelectable(false);
      hintLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 0.4));
      hintLabel.setAlignment($.NSTextAlignmentRight);
      hintLabel.setFont(hintFont);
      panel.addSubview(hintLabel);

      // Transparent click-capture button (on top of everything)
      var btn = $.NSButton.alloc.initWithFrame($.NSMakeRect(0, 0, winWidth, winHeight));
      btn.setTitle($(''));
      btn.setBordered(false);
      btn.setTransparent(true);
      btn.setTarget(clickHandler);
      btn.setAction('handleClick');
      contentView.addSubview(btn);
    }

    // ── Fade-in entrance animation ──
    win.setAlphaValue(0.0);
    win.orderFrontRegardless;

    var fadeIn = $.CABasicAnimation.animationWithKeyPath('opacity');
    fadeIn.fromValue = 0.0;
    fadeIn.toValue = 1.0;
    fadeIn.duration = 0.35;
    fadeIn.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionEaseOut);
    contentView.layer.addAnimationForKey(fadeIn, 'fadeIn');
    win.setAlphaValue(1.0);

    windows.push(win);
  }

  // Auto-dismiss timer
  if (dismiss > 0) {
    $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(
      dismiss,
      $.NSApp,
      'terminate:',
      null,
      false
    );
  }

  // Event-driven dismissal
  ObjC.registerSubclass({
    name: 'PeonDismissObserver',
    superclass: 'NSObject',
    methods: {
      'handleDismiss:': {
        types: ['void', ['id']],
        implementation: function(notification) {
          $.NSApp.terminate(null);
        }
      }
    }
  });
  var observer = $.PeonDismissObserver.alloc.init;
  $.NSDistributedNotificationCenter.defaultCenter.addObserverSelectorNameObject(
    observer,
    'handleDismiss:',
    $(dismissNotificationName),
    $.NSString.string
  );

  $.NSApp.run;
}
