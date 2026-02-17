---
title: The Fractured Jukebox Report
description: Technical Report on The Fractured Jukebox MIDI visualizer
publishDate: 1972-01-15
tags: [dsp, audio, web]
---

## Overview
I always figured a better music visualizer could help people learn music theory and develop their ear by using note accurate effects. The Fractured Jukebox is my attempt at making one and I am happy with the result. The Clock preset with Theory Bar is the clearest view into the mechanics

[TODO Grab Clock Preset]

This is the first non-trivial project I've built entirely using Claude Code and I am very happy with the experience. It's hard to believe seeing all the code scroll by on the terminal and to think of the effort needed just to type it in. I'll put some tips and tricks I picked up for agent driven development at the end.

MIDI files allow for easy, note perfect analysis. Only supporting well defined input is an important restriction so that effects can really tie into fine grained details and even have knowledge of the future. This is needed for the trail effect for sustained notes in Note Star: 

[Cars in Note Star view](https://decompiled.dev/fractals/?l=pop&t=9)

The data is a well defined static file, which is the easiest and simplest case to model and design around. Any part can be changed independently without any consideration of others. Effects can be added and removed very easily. However complicated layed effects may look, there is hardly any complexity. All of the app can be modeled as a simple pipeline, like a series of pedals modifying the signal from an electric guitar.

MIDI -> Analysis Engine -> Music Params -> Effects -> Compositor -> Canvas
  
This simple architecture and being able to use my eyes and ears for quality assurance made this project very appealing to build up an intuition about the limitations of coding agents.

## Theory

Standard Western music theory states music is composed of four elements: 
1. rhythm 
2. pitch
3. harmony
4. timbre <- Not accounted for visually

MIDI files are structured to convey this information efficiently. Sheet music is the standard view of MIDI, rhythm is expressed by BPM, time signature and note shapes. Pitch is expressed relative to a staff, timbre is by the instrument label for the track. 

Harmony is interesting because its not directly expressed in the data, but it can be extracted by considering the combination of rhythm and pitch. Its like a secret layer of information that can be obtained by analysis . Usually harmony is expressed by chord symbols, consider the line from Leonard Cohen's Hallelujah

"It goes like this, the fourth (IV) the fifth (V), the minor fall (iii) and the major lift (I)"

The visualizer itself is meant to show how many different views are possible for one type of data, and how rearrange pixel representations different information is revealed. Well structured data is can marshall pixels to represent it in many different ways. Each way is able to emphasize different parts of the data and having many different views allows for the most amount of information to be extracted from it.

## Hypothesis

A well structured music visualizer can sublimely implant music theory concepts into its viewer.

## Tools
- HTML Canvas: for rendering the image
- JavaScript
  - @tonejs/midi: MIDI tools
  - spessasynth_lib: Provides nice MIDI tones and many instruments
  - gsap: Animation library used to smooth some visual effects
- Claude Code: To write all of code

## Methods

The basic idea was to brainstorm different ways to represent each element of music, ask Claude to implement them, and then decide on the most promising features to keep and refine. Most of the features were created by applying this simple process over and over again. A few features however didn't feel right even though they seemed like they should be able to work. 

To solve this I started asking Claude to conduct literature reviews and to synthesize working theories to base our implementations off of. The most notable outcome of this was the groove curve, this greatly improved the musicality of all of the visualization that were able to tie into it.

[Groove Report](https://github.com/eric-decompiled/dsp/blob/main/fractals/research/groove-and-visualizers.md)

There are many high quality papers linked, and I am confident with a proper read of the papers linked I'd find more insights for even more improvements. After a few research cycles I had Claude document a PROCESS.md file, which made ordering these lit reviews fairly low friction. I'd tell Claude to dispatch as a "bg task" so I could continue working as the research was being collected.

Even though agent driven development requires different techniques compared to typing in code directly, my general process remains the same, just with a faster feedback loop. In a big picture view I think of code quality results from running through the Observe -> Orient -> Decide -> Act (OODA) loop. The more times the coder runs through that loop the higher quality their work will be. Agents shrink the time needed for each step and change the techniques, but my high level approach didn't need to change. Even with Claude Code the implementation still took a fair amount of time and effort. I do feel the quality of the app is much higher for the user had I put in similar effort using traditional coding. 

The commit history is [public](https://github.com/eric-decompiled/dsp/commits/main/fractals) for the curious. The bulk of the work was done over a two week period.

## Features



## Thoughts on Claude Code
- CLAUDE.md
- Context Management, split into /docs
- Research + Synthesis, provides some really nice reports
- Lets many features be sketched out quickly. Avoids sunk cost on prototypes
- Takes a lot of iteration. There is a lot of tuning work that requires judgement.

I find myself frequently thinking of The Man-Machine symbiosis paper by JCR Licklider. The man on the cover of "The Dream Machine: The Revolution that made Computing Personal". Stripe Press publishes an edition, but its is a rather unnerving cover. 

There's many times where I know a certain tool would be useful, and it would be in my capability to create it, but the time spent on it would not be worth it if its only used dozens of times. Claude Code really changes this ROI calculation for me. If I want to check my understanding of something I find myself frequently asking for a Claude to make me a small demo to play with. When I want to understand a budget I ask Claude to make a d3 chart for me. To research stuff I ask Claude to first review and make a report of the literature and refer me to the best papers.

While all of these tasks I could do without an LLM agent, the LLM agent significantly reduces the hurdle for them. None of them individually are massive game changers, but a lot of quick little advantages do add up. In a mature codebase with real customers I'd be wary of large LLM edits, but to extract actionable insights from such a system I feel they have become a must have tool.
