# Enable Powerlevel10k instant prompt. Keep this near the top.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

export PATH="$HOME/.local/bin:$PATH"
eval "$(mise activate zsh)"
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export PATH="${HOMEBREW_PREFIX:-/opt/homebrew}/opt/openssl/bin:$PATH"
eval "$(zoxide init zsh)"

# Path to your Oh My Zsh installation.
export ZSH="${ZSH:-$HOME/.oh-my-zsh}"
export ZSH_CUSTOM="${XDG_DATA_HOME:-$HOME/.local/share}/dotfiles/zsh"
export DOTNET_ROOT=$HOME/.dotnet
export PATH=$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH

# Theme.
ZSH_THEME="powerlevel10k/powerlevel10k"

plugins=(
  git
  tmux
  zsh-autosuggestions
  zsh-interactive-cd
  zsh-syntax-highlighting
  zsh-vi-mode
)

source $ZSH/oh-my-zsh.sh

# Preferred editor for local and remote sessions.
if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='nvim'
fi

alias c="clear"
alias lg="lazygit"
alias vwapi="vw-openapi.sh"
alias cd="z"

# To customize the prompt, run `p10k configure` or edit zsh/p10k.zsh in this repository.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

eval "$(atuin init zsh)"
