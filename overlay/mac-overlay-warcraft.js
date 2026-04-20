#!/usr/bin/env osascript -l JavaScript
// mac-overlay-warcraft.js — Warcraft / Horde themed JXA Cocoa overlay for macOS
// Usage: osascript -l JavaScript mac-overlay-warcraft.js <message> <color> <icon_path> <slot> <dismiss_seconds> [bundle_id] [ide_pid] [session_tty] [subtitle] [position] [notify_type] [all_screens] [screen_index]
//
// Signature-compatible with mac-overlay-kerrigan.js so peon-ping can hot-swap themes.
// Visual design: dark stone/obsidian panel, orc green glow, gold accents, iron
// corner rivets, torch-flicker sweep, parchment-cream typewriter text.

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

  // ── Warcraft palette ──
  // Base: dark obsidian / charred wood background.
  // Glow driven by category color but always evokes orc/Horde vibe.
  var glowR, glowG, glowB;          // primary glow (borders, rivets, sweep)
  var accentR, accentG, accentB;    // secondary accent (HUD micro-text)
  var tag = '⚔ WAR COUNCIL';
  switch (color) {
    case 'blue':   // task.complete — "job's done" — victory green
      glowR = 120/255; glowG = 200/255; glowB =  80/255;
      accentR = 212/255; accentG = 160/255; accentB =  57/255;
      tag = '⚒ JOB DONE';
      break;
    case 'yellow': // input.required — attention — torch gold
      glowR = 230/255; glowG = 170/255; glowB =  50/255;
      accentR = 180/255; accentG =  90/255; accentB =  30/255;
      tag = '☼ ORDERS AWAITED';
      break;
    case 'red':    // task.error — forge red
      glowR = 200/255; glowG =  50/255; glowB =  40/255;
      accentR = 240/255; accentG = 160/255; accentB =  60/255;
      tag = '☠ THE BATTLE TURNS';
      break;
    default:       // session.start / acknowledge / spam — orc green
      glowR =  90/255; glowG = 180/255; glowB =  70/255;
      accentR = 212/255; accentG = 160/255; accentB =  57/255;
      tag = '⚔ FOR THE HORDE';
      break;
  }

  var winWidth = 520, winHeight = 90;

  $.NSApplication.sharedApplication;
  $.NSApp.setActivationPolicy($.NSApplicationActivationPolicyAccessory);

  var persistent = dismiss <= 0;
  var dismissNotificationName = 'com.peonping.dismiss.' + slot;

  // ── Click handler (preserved — identical to Kerrigan overlay) ──
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
              $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(0.05, $.NSApp, 'terminate:', null, false);
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
                  activated = true; break;
                }
              }
            }
            if (!activated && idePid > 0) {
              var ideApp = $.NSRunningApplication.runningApplicationWithProcessIdentifier(idePid);
              if (ideApp && !ideApp.isNil()) {
                ideApp.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
              }
            }
            $.NSDistributedNotificationCenter.defaultCenter.postNotificationNameObject($(dismissNotificationName), $.NSString.string);
            $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(0.05, $.NSApp, 'terminate:', null, false);
          }
        }
      }
    });
    clickHandler = $.PeonClickHandler.alloc.init;
  }

  var screens = $.NSScreen.screens;
  var screenCount = screens.count;
  var windows = [];

  var startIdx = 0, endIdx = screenCount;
  if (screenIdx >= 0 && screenIdx < screenCount) {
    startIdx = screenIdx; endIdx = screenIdx + 1;
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
    startIdx = focusedIdx; endIdx = focusedIdx + 1;
  }

  for (var i = startIdx; i < endIdx; i++) {
    var screen = screens.objectAtIndex(i);
    var visibleFrame = screen.visibleFrame;

    var margin = 10;
    var slotStep = winHeight + margin + 10;
    var ySlotOffset = margin + slot * slotStep;
    var x, y;
    switch (position) {
      case 'top-right':
        x = visibleFrame.origin.x + visibleFrame.size.width - winWidth - margin;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset; break;
      case 'top-left':
        x = visibleFrame.origin.x + margin;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset; break;
      case 'bottom-right':
        x = visibleFrame.origin.x + visibleFrame.size.width - winWidth - margin;
        y = visibleFrame.origin.y + ySlotOffset; break;
      case 'bottom-left':
        x = visibleFrame.origin.x + margin;
        y = visibleFrame.origin.y + ySlotOffset; break;
      case 'bottom-center':
        x = visibleFrame.origin.x + (visibleFrame.size.width - winWidth) / 2;
        y = visibleFrame.origin.y + ySlotOffset; break;
      default:
        x = visibleFrame.origin.x + (visibleFrame.size.width - winWidth) / 2;
        y = visibleFrame.origin.y + visibleFrame.size.height - winHeight - ySlotOffset;
    }
    var frame = $.NSMakeRect(x, y, winWidth, winHeight);

    var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
      frame, $.NSWindowStyleMaskBorderless, $.NSBackingStoreBuffered, false
    );
    win.setBackgroundColor($.NSColor.clearColor);
    win.setOpaque(false);
    win.setAlphaValue(1.0);
    win.setLevel($.NSStatusWindowLevel);
    win.setHasShadow(false);
    if (!clickHandler) win.setIgnoresMouseEvents(true);
    win.setCollectionBehavior(
      $.NSWindowCollectionBehaviorCanJoinAllSpaces |
      $.NSWindowCollectionBehaviorStationary
    );

    var contentView = win.contentView;
    contentView.wantsLayer = true;
    contentView.layer.masksToBounds = false;

    // ── Outer glow (torch flicker) ──
    var cgGlowColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.75);
    contentView.layer.shadowColor = cgGlowColor;
    contentView.layer.shadowOffset = $.CGSizeMake(0, 0);
    contentView.layer.shadowRadius = 16;
    contentView.layer.shadowOpacity = 1.0;

    // Torch flicker — irregular pulse, 2.2s cycle
    var glowPulse = $.CABasicAnimation.animationWithKeyPath('shadowOpacity');
    glowPulse.fromValue = 1.0;
    glowPulse.toValue = 0.55;
    glowPulse.duration = 2.2;
    glowPulse.autoreverses = true;
    glowPulse.repeatCount = 1e30;
    glowPulse.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionEaseInEaseOut);
    contentView.layer.addAnimationForKey(glowPulse, 'glowPulse');

    // ── Main panel: dark obsidian / charred stone ──
    var panelInset = 4;
    var panelFrame = $.NSMakeRect(panelInset, panelInset, winWidth - panelInset * 2, winHeight - panelInset * 2);
    var panel = $.NSView.alloc.initWithFrame(panelFrame);
    panel.wantsLayer = true;
    // Dark brown/black charred wood base
    panel.layer.backgroundColor = $.CGColorCreateGenericRGB(0.08, 0.05, 0.03, 0.92);
    panel.layer.cornerRadius = 6; // harder, more stone-like corners
    panel.layer.masksToBounds = true;
    // Thick iron-ish border
    panel.layer.borderWidth = 1.6;
    panel.layer.borderColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.7);
    contentView.addSubview(panel);

    // ── Inner gold inlay (top and bottom) ──
    var goldR = 212/255, goldG = 160/255, goldB = 57/255;
    var topGold = $.NSView.alloc.initWithFrame($.NSMakeRect(0, panelFrame.size.height - 2, panelFrame.size.width, 2));
    topGold.wantsLayer = true;
    topGold.layer.backgroundColor = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.35);
    panel.addSubview(topGold);
    var botGold = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, 1));
    botGold.wantsLayer = true;
    botGold.layer.backgroundColor = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.25);
    panel.addSubview(botGold);

    // ── Parchment grain (very subtle horizontal lines, warmer tone) ──
    var grainContainer = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, panelFrame.size.height));
    grainContainer.wantsLayer = true;
    grainContainer.layer.masksToBounds = true;
    for (var sl = 0; sl < panelFrame.size.height; sl += 4) {
      var grain = $.CALayer.layer;
      grain.frame = $.CGRectMake(0, sl, panelFrame.size.width, 1);
      // warm sepia instead of cold black
      grain.backgroundColor = $.CGColorCreateGenericRGB(0.15, 0.08, 0.04, 0.18);
      grainContainer.layer.addSublayer(grain);
    }
    panel.addSubview(grainContainer);

    // ── Torch embers sweep (instead of cold scan beam) ──
    var emberSweep = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panelFrame.size.width, 4));
    emberSweep.wantsLayer = true;
    emberSweep.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.18);
    emberSweep.layer.shadowColor = $.CGColorCreateGenericRGB(glowR * 1.1, glowG * 0.9, glowB * 0.5, 0.9);
    emberSweep.layer.shadowOffset = $.CGSizeMake(0, 0);
    emberSweep.layer.shadowRadius = 8;
    emberSweep.layer.shadowOpacity = 1.0;
    emberSweep.layer.masksToBounds = false;
    panel.addSubview(emberSweep);
    var sweepAnim = $.CABasicAnimation.animationWithKeyPath('position.y');
    sweepAnim.fromValue = 0;
    sweepAnim.toValue = panelFrame.size.height;
    sweepAnim.duration = 3.2; // slower, like a drifting flame
    sweepAnim.repeatCount = 1e30;
    sweepAnim.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionLinear);
    emberSweep.layer.addAnimationForKey(sweepAnim, 'sweep');

    // ── Iron corner rivets (heavier than Kerrigan's HUD brackets) ──
    var rivetSize = 6;
    var rivetInset = 4;
    var rivetColor = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.8);
    var rivetGlow  = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.5);
    var rivetPositions = [
      [rivetInset, rivetInset],
      [panelFrame.size.width - rivetInset - rivetSize, rivetInset],
      [rivetInset, panelFrame.size.height - rivetInset - rivetSize],
      [panelFrame.size.width - rivetInset - rivetSize, panelFrame.size.height - rivetInset - rivetSize]
    ];
    for (var ri = 0; ri < rivetPositions.length; ri++) {
      var rp = rivetPositions[ri];
      var rivet = $.CALayer.layer;
      rivet.frame = $.CGRectMake(rp[0], rp[1], rivetSize, rivetSize);
      rivet.backgroundColor = rivetColor;
      rivet.cornerRadius = rivetSize / 2;
      rivet.shadowColor = rivetGlow;
      rivet.shadowOffset = $.CGSizeMake(0, 0);
      rivet.shadowRadius = 3;
      rivet.shadowOpacity = 0.8;
      panel.layer.addSublayer(rivet);
    }

    // ── Icon with iron ring frame ──
    var textX = 16, textWidth = panelFrame.size.width - 40;
    if (iconPath !== '' && $.NSFileManager.defaultManager.fileExistsAtPath(iconPath)) {
      var iconImage = $.NSImage.alloc.initWithContentsOfFile(iconPath);
      if (iconImage && !iconImage.isNil()) {
        var iconDiameter = 62;
        var iconPadding = 12;
        var iconCenterY = (panelFrame.size.height - iconDiameter) / 2;

        // Thick iron ring — gold accent, bronze inner
        var ringSize = iconDiameter + 10;
        var ringView = $.NSView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding - 5, iconCenterY - 5, ringSize, ringSize)
        );
        ringView.wantsLayer = true;
        ringView.layer.cornerRadius = ringSize / 2;
        ringView.layer.borderWidth = 2.0;
        ringView.layer.borderColor = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.75);
        ringView.layer.backgroundColor = $.CGColorCreateGenericRGB(0.12, 0.08, 0.04, 0.9);
        ringView.layer.shadowColor = $.CGColorCreateGenericRGB(glowR, glowG, glowB, 0.85);
        ringView.layer.shadowOffset = $.CGSizeMake(0, 0);
        ringView.layer.shadowRadius = 10;
        ringView.layer.shadowOpacity = 0.7;
        ringView.layer.masksToBounds = false;
        panel.addSubview(ringView);

        var ringPulse = $.CABasicAnimation.animationWithKeyPath('shadowOpacity');
        ringPulse.fromValue = 0.7;
        ringPulse.toValue = 0.25;
        ringPulse.duration = 1.8;
        ringPulse.autoreverses = true;
        ringPulse.repeatCount = 1e30;
        ringPulse.timingFunction = $.CAMediaTimingFunction.functionWithName($.kCAMediaTimingFunctionEaseInEaseOut);
        ringView.layer.addAnimationForKey(ringPulse, 'ringPulse');

        var iconView = $.NSImageView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding, iconCenterY, iconDiameter, iconDiameter)
        );
        iconView.setImage(iconImage);
        iconView.setImageScaling($.NSImageScaleProportionallyUpOrDown);
        iconView.wantsLayer = true;
        iconView.layer.cornerRadius = iconDiameter / 2;
        iconView.layer.masksToBounds = true;
        iconView.layer.borderWidth = 1.0;
        iconView.layer.borderColor = $.CGColorCreateGenericRGB(goldR, goldG, goldB, 0.5);
        panel.addSubview(iconView);

        // Warm amber overlay on icon (torchlight cast)
        var tintOverlay = $.NSView.alloc.initWithFrame(
          $.NSMakeRect(iconPadding, iconCenterY, iconDiameter, iconDiameter)
        );
        tintOverlay.wantsLayer = true;
        tintOverlay.layer.cornerRadius = iconDiameter / 2;
        tintOverlay.layer.masksToBounds = true;
        tintOverlay.layer.backgroundColor = $.CGColorCreateGenericRGB(glowR, glowG * 0.8, glowB * 0.4, 0.15);
        panel.addSubview(tintOverlay);

        textX = iconPadding + iconDiameter + 14;
        textWidth = panelFrame.size.width - textX - 20;
      }
    }

    // ── Top tag ──
    var tagFont = $.NSFont.fontWithNameSize('Menlo-Bold', 8.5);
    if (!tagFont || tagFont.isNil()) tagFont = $.NSFont.boldSystemFontOfSize(8.5);
    var tagLabel = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, panelFrame.size.height - 22, textWidth, 12)
    );
    tagLabel.setStringValue($(tag));
    tagLabel.setBezeled(false);
    tagLabel.setDrawsBackground(false);
    tagLabel.setEditable(false);
    tagLabel.setSelectable(false);
    tagLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(goldR, goldG, goldB, 0.85));
    tagLabel.setFont(tagFont);
    tagLabel.setLineBreakMode($.NSLineBreakByTruncatingTail);
    tagLabel.cell.setWraps(false);
    panel.addSubview(tagLabel);

    // ── Message label — parchment cream with warm glow ──
    var font = $.NSFont.fontWithNameSize('Menlo-Bold', 15);
    if (!font || font.isNil()) font = $.NSFont.boldSystemFontOfSize(15);
    var textHeight = 22;
    var textY = (panelFrame.size.height - textHeight) / 2 - 2;
    var label = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, textY, textWidth, textHeight)
    );
    label.setStringValue($(''));
    label.setBezeled(false);
    label.setDrawsBackground(false);
    label.setEditable(false);
    label.setSelectable(false);
    label.setFont(font);
    label.setLineBreakMode($.NSLineBreakByTruncatingTail);
    label.cell.setWraps(false);

    // Parchment-cream text color
    var textColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(0.95, 0.87, 0.70, 1.0);
    label.setTextColor(textColor);
    var shadow = $.NSShadow.alloc.init;
    shadow.shadowColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(glowR, glowG, glowB, 0.9);
    shadow.shadowOffset = $.NSMakeSize(0, 0);
    shadow.shadowBlurRadius = 8;
    label.shadow = shadow;
    panel.addSubview(label);

    windows._labels = windows._labels || [];
    windows._labels.push(label);

    // ── Status bar: Horde chant / rune glyph ──
    var statusFont = $.NSFont.fontWithNameSize('Menlo', 9);
    if (!statusFont || statusFont.isNil()) statusFont = $.NSFont.systemFontOfSize(9);
    var statusLabel = $.NSTextField.alloc.initWithFrame(
      $.NSMakeRect(textX, 6, textWidth, 12)
    );
    // Rune runes + chant
    var runes = ['ᚱ','ᚨ','ᚷ','ᚺ','ᛟ','ᚦ','ᛞ','ᚠ'];
    function r3() {
      return runes[Math.floor(Math.random()*runes.length)] +
             runes[Math.floor(Math.random()*runes.length)] +
             runes[Math.floor(Math.random()*runes.length)];
    }
    var chants = ['ZUG ZUG', 'LOK\'TAR OGAR', 'FOR THE HORDE', 'WORK WORK', 'BLOOD AND THUNDER', 'BY THE WARCHIEF'];
    var chant = chants[Math.floor(Math.random() * chants.length)];
    var statusText = '⚒ ' + r3() + ' ████░░ ' + chant + ' ⚒';
    statusLabel.setStringValue($(statusText));
    statusLabel.setBezeled(false);
    statusLabel.setDrawsBackground(false);
    statusLabel.setEditable(false);
    statusLabel.setSelectable(false);
    statusLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(accentR, accentG, accentB, 0.6));
    statusLabel.setFont(statusFont);
    statusLabel.setLineBreakMode($.NSLineBreakByTruncatingTail);
    statusLabel.cell.setWraps(false);
    panel.addSubview(statusLabel);

    // ── click hint ──
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
      hintLabel.setTextColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(goldR, goldG, goldB, 0.55));
      hintLabel.setAlignment($.NSTextAlignmentRight);
      hintLabel.setFont(hintFont);
      panel.addSubview(hintLabel);

      var btn = $.NSButton.alloc.initWithFrame($.NSMakeRect(0, 0, winWidth, winHeight));
      btn.setTitle($(''));
      btn.setBordered(false);
      btn.setTransparent(true);
      btn.setTarget(clickHandler);
      btn.setAction('handleClick');
      contentView.addSubview(btn);
    }

    // ── Fade-in ──
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

  // ── Typewriter ──
  var labels = windows._labels || [];
  var twIdx = 0;
  var cursorVisible = true;

  ObjC.registerSubclass({
    name: 'PeonTypewriter',
    superclass: 'NSObject',
    methods: {
      'tick:': {
        types: ['void', ['id']],
        implementation: function(timer) {
          twIdx++;
          if (twIdx > message.length) {
            timer.invalidate();
            for (var i = 0; i < labels.length; i++) labels[i].setStringValue($(message + ' ▌'));
            return;
          }
          var partial = message.substring(0, twIdx) + '▌';
          for (var i = 0; i < labels.length; i++) labels[i].setStringValue($(partial));
        }
      },
      'blink:': {
        types: ['void', ['id']],
        implementation: function(timer) {
          if (twIdx <= message.length) return;
          cursorVisible = !cursorVisible;
          var text = cursorVisible ? message + ' ▌' : message;
          for (var i = 0; i < labels.length; i++) labels[i].setStringValue($(text));
        }
      }
    }
  });

  var tw = $.PeonTypewriter.alloc.init;
  var charDelay = Math.min(0.04, dismiss > 0 ? (dismiss * 0.35) / Math.max(message.length, 1) : 0.04);
  $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(charDelay, tw, 'tick:', null, true);
  $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(0.5, tw, 'blink:', null, true);

  if (dismiss > 0) {
    $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(dismiss, $.NSApp, 'terminate:', null, false);
  }

  ObjC.registerSubclass({
    name: 'PeonDismissObserver',
    superclass: 'NSObject',
    methods: {
      'handleDismiss:': {
        types: ['void', ['id']],
        implementation: function(notification) { $.NSApp.terminate(null); }
      }
    }
  });
  var observer = $.PeonDismissObserver.alloc.init;
  $.NSDistributedNotificationCenter.defaultCenter.addObserverSelectorNameObject(
    observer, 'handleDismiss:', $(dismissNotificationName), $.NSString.string
  );

  $.NSApp.run;
}
