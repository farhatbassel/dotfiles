#!/bin/sh
set -eu

config_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
zshrc="$HOME/.zshrc"
export ZSH="${ZSH:-$HOME/.oh-my-zsh}"
export ZSH_CUSTOM="${XDG_DATA_HOME:-$HOME/.local/share}/dotfiles/zsh"

if [ -e "$zshrc" ] || [ -L "$zshrc" ]; then
  if [ ! "$zshrc" -ef "$config_dir/.zshrc" ]; then
    printf 'Refusing to overwrite %s. Back it up and remove it, then rerun setup.\n' "$zshrc" >&2
    exit 1
  fi
fi

install_repo() {
  repository=$1
  destination=$2
  entrypoint=$3

  if [ ! -e "$destination" ] && [ ! -L "$destination" ]; then
    git clone --depth 1 "https://github.com/$repository.git" "$destination"
  fi

  if [ ! -f "$destination/$entrypoint" ]; then
    printf 'Incomplete Zsh dependency at %s: missing %s.\n' "$destination" "$entrypoint" >&2
    exit 1
  fi
}

install_repo ohmyzsh/ohmyzsh "$ZSH" oh-my-zsh.sh
mkdir -p "$ZSH_CUSTOM/plugins" "$ZSH_CUSTOM/themes"
install_repo zsh-users/zsh-autosuggestions \
  "$ZSH_CUSTOM/plugins/zsh-autosuggestions" zsh-autosuggestions.plugin.zsh
install_repo jeffreytse/zsh-vi-mode \
  "$ZSH_CUSTOM/plugins/zsh-vi-mode" zsh-vi-mode.zsh
install_repo zsh-users/zsh-syntax-highlighting \
  "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" zsh-syntax-highlighting.plugin.zsh
install_repo romkatv/powerlevel10k \
  "$ZSH_CUSTOM/themes/powerlevel10k" powerlevel10k.zsh-theme

if [ ! -e "$zshrc" ] && [ ! -L "$zshrc" ]; then
  ln -s "$config_dir/.zshrc" "$zshrc"
fi
