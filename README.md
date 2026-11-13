# Portable global configuration

My goal in this repo is to make my configuration portable

## Mise Setup

```sh
mise run setup
```

## Zsh Setup

Since I like my zsh shell and I use it everywhere I also want it to
be imported in across all my devices

My idea was to maintain everything on this repo and just link the local
`~/.zshrc` and even the `~/.p10k.zsh` files

The setup file is there to do the linking the install of the tools I need

If anything fails with p10k and this just a reminder to myself :)

```sh
p10k configure
```

## AI (I know..)

The reason for this is it works..

A quick local review from my agent and I found something that I have missed
during my latest changes.

I am not giving the agent full access to my local git (I just don't trust them
with desctructive tools), so I did the thing that everyone did, 2 years ago at
point, I created an mcp server (in `ts`, I might rewrite it), that gives it access
to the actual tools it needs for a review.

I am happy so far and it works thanks to mise accross all repos. (I love mise)

### Note

Reason for `ts` was because I wanted to push it on my team, in the end it didn't
work, nor did it matter, it's just a wrapper around git


## Test in Docker

The easiest way for me to run all the files is just using docker. I can 
easily check if the changes I am making run on future devices by checking
hoping into the container and running them

Running the container is as easy as:

```sh
docker build -f testing/Dockerfile -t dotfiles-test .
docker run -d --name dotfiles-test dotfiles-test
docker exec -it dotfiles-test zsh
```
