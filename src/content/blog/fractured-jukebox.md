---
title: The Fractured Jukebox Tech Report
description: Insights from building the Fractured Jukebox
publishDate: 2026-03-10
tags: [report]
---

[The Fractured Jukebox](https://decompiled.dev/apps/fractured-jukebox/) is a MIDI visualizer. Out of all the data formats I think MIDI has the best beauty-to-bit ratio. This post will walk through the tech stack, how I used Claude and conclude with some thoughts. The code can be found on [GitHub](https://github.com/eric-decompiled/Home/tree/main/apps/fractured-jukebox).

The Fractured Jukebox is my first non-trivial project I built without having to write a single line of code. I've made my living for the past ten years writing code too. It's pretty surreal seeing how fast features can be implemented now. For me it already feels hard to imagine people used to write code line by line before, even though I used to do that not that long ago.

## Tech

I am a big fan of static sites, especially for hobby projects. I find there's elegance in delivering an experience through a single web page. I think something was lost in the rapid commercialization of the internet of [web 2.0](https://en.wikipedia.org/wiki/Web_2.0) and I like to honour the old web when I can. 

I brought in two libraries to handle MIDI, [@tonejs/midi](https://github.com/Tonejs/Midi) and [spessasynth_lib](https://github.com/spessasus/spessasynth_lib) for the MIDI player. For a while I used [GSAP](https://gsap.com/) to smooth out some animations, but I realized I could ask Claude to write the few [tweening](https://en.wikipedia.org/wiki/Inbetweening) functions as a utility. It was really nice to remove a dependency in a few minutes just by asking. 

I used [vite](https://vite.dev/), having my phone connected to the hot reload server and seeing it get updated after asking Claude. Vite is so good compared to the web tooling from 2016, which is when I started coding.

The process was to ask Claude to implement something, do some quality assurance and move onto the next idea. LLMs are good at writing code, but they seem to have limited aesthetic sense beyond cliches and have poor UX sense. Which makes sense to me, but it also shifts the limiting skill sets from before.

## Research

Using Claude to pull in a bunch of papers and summarize was very helpful and very educational. It's all in the [repo](https://github.com/eric-decompiled/Home/tree/main/apps/fractured-jukebox/research) along with the process if you are interested.

Having the process documented made it easy to set off a research expedition into some area. [Markdown](https://en.wikipedia.org/wiki/Markdown) is working as a fuzzy programming language here. I am not concerned with it being followed exactly, but it's enough to guide the LLM to go in depth and create a readable summary with little prompting overhead.

The summaries along with links to the actual papers is a nice artifact, both for me and the LLM. The practical insights that came from this were the groove curve and the anticipation mechanism. Together I feel they were the secret sauce to making it feel musical. 

### Groove Curve

The groove curve, which is essentially two functions, `sin(beat)` and `sin(bar)` can be seen in Theory Bar. It accounts for instruments to give it a bit of irregularity. Effects can use this output to emphasize on-beats more than off-beats. The effect is subtle for the most part, but can be seen in the Stars preset on repeated 8th notes. This added musicality early on and felt like a big win from an early research expedition.

### Anticipation

The other big enhancement was anticipation, which can be seen in the metronome dots. The one about to light up begins to faintly glow before it pops bright with the beat. 

![Metronome anticipation](/images/blog/fractured-jukebox/loop.gif)

*Metronome dots*

Applying this effect to the stars was the most difficult part to get working across tempos and genres, even with Claude. Notes would get stuck and jump or not appear. Even though it's subtle, I think it improves the feel quite a bit and was worth the hassle.

### Tonnetz

There is a [Tonnetz](https://en.wikipedia.org/wiki/Tonnetz) foreground effect, which I feel isn't as good as the other features, but I am not sure how to improve either. I do want to understand the Tonnetz lattice deeper someday, so I left the effect in on that account. 

In a Tonnetz lattice notes are positioned so chords can be made out of triangles. Chord progressions that change one note at a time sound smoother than ones that move all the notes. I believe a Tonnetz distance of chord changes could measure voice leading smoothness. This could help distinguish genres since some styles pay more attention to voice leading than others.

### Fractals

The Fractured part of the name came from its origins as a fractal visualizer. I thought what if a fractal could dance and ran with that. I was unaware of the variety of fractals. Prior to starting I was ignorant beyond the classic Mandelbrot and Julia sets. 

There is a foreground effect "Fractals", in the Customize page you can explore different fractal families for yourself. Each family has an info card with its formula and brief history. 

The original idea was to assign each chord to an area on a fractal and use the beat as input into the params. I was thinking each chord could get its own shape, and to distinguish between major/minor and 7ths, but the difficulty exceeded my interest. For now it's configured only to respond to the bass note of each chord, so there is no difference between Amaj7 vs Am, they are both A chords and are identical to the fractal engine.

I think the fractals are too chaotic and unsettling in terms of a product/user experience, but they are really fascinating structures. I tried to keep it somewhat hidden from a casual user to hopefully minimize confusion, but left it in because I think it's cool, and it's referenced in the app's name. 

![Configuring Celtic Fractal and beat points](/images/blog/fractured-jukebox/celtic-beatpoints.png)

*Configuring a Celtic Fractal anchor and "beat points"*

## Lessons

### Do Your Research

As a general strategy asking an LLM to do a lit review and summarize it and to distill a working theory seems widely applicable. There's a good chance the LLM will be able to use it, and even if it can't it should still be able to create a reading list for the user. It might take a while, but it can be done in the background.

This provides context material so the LLM has a better chance at generating novel approaches and lets the human build up their domain knowledge as well. Given how easy it is to do and how valuable a surprise insight can be it seems always worthwhile to make these kinds of surveys now.

I also let it know I can download important papers if it gets blocked. Sometimes it would be overly persistent in the face of 403 (Forbidden) codes when crawling.

### Context Management

After telling Claude to update CLAUDE.md frequently with our learnings I began to face frequent compactions. A large CLAUDE.md is expensive in terms of token economics. To solve this Claude moved the content into a `/docs` directory organized by problem area and left only a reference in the main file.

This was the same strategy described on [OpenAI's blog](https://openai.com/index/harness-engineering/) with Codex. They even used the same directory name of `/docs`.

To me it seems like the context window is the scarce resource when using LLMs, which conflicts with their tendency for verbosity. Now that people don't have to modify the computer code directly as often, there might be benefit to using a denser style or language compared to what people want to write and read. 

After working on a feature I would get the model to update CLAUDE.md, then type `/clear`. Although I would forget, I think it's best to avoid auto-compaction and to frequently update the domain understanding instead. Auto-compact works fine, but important context needs to be written to durable media before it's forgotten and clear runs a lot faster.

Periodically managing a resource along with the [PeonPing](https://www.peonping.com/) plugin makes me feel the Real-Time-Strategy game experience from my youth is finally paying off. The plugin quotes lines from games like Warcraft and Starcraft when Claude starts or completes tasks or needs permission for something. I find it fun and useful.

### Shifting Skill Sets

Usability, design and quality assurance seem to be areas neglected by most devs. Those functions are normally split across roles in companies, which probably plays a role in this. These areas also seem to be the areas in which humans will maintain an advantage in and provide complementary strengths for the LLM. 

Most of the time building was spent on aesthetic tuning and feature curation. Many effects that were tried didn't make it into the app. It's very nice to be able to verbalize a vague idea and see something on the screen without getting distracted by programming syntax and the rigour of thought it demands. 

I find it freeing to try out something quickly and not be burdened by the sunk cost of an hour of coding when having to backtrack.

## Conclusion

I enjoyed making the Fractured Jukebox. It's been a while since coding has completely captivated my attention like making it has. I am optimistic these tools will continue to improve for quite some time and think it's a really exciting time in tech.

I like to think I was pretty good at writing code, but I am also happy that writing actual syntax in large quantities is no longer required. Programming languages are very constrained by design and are pretty limited in expressive power. Any programming construct can be described in English fairly easily, if/else and loops are almost self-explanatory, and there are many things expressible in natural language unexpressible in programming language.

I used to think that programming languages were necessary to avoid the ambiguity present in natural language, but I've had to change my mind on that. Now I think the ambiguity of language is because it's able to express much more complex ideas unavailable to programming languages. It's possible to be just as exact in less English "tokens" than with code, and many more ideas can be expressed in addition when exactness isn't a requirement.

Overall I think LLMs act more as a multiplier rather than a generator. It still takes effort and thinking to get good results from them. They also require a different skill set than traditional coding did. I am looking forward to the new paradigms that can emerge.

Thanks for reading! I hope you enjoyed The Fractured Jukebox and found this report interesting.
