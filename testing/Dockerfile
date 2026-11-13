FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential ca-certificates curl git locales \
        libbz2-dev libevent-dev libffi-dev liblzma-dev libncurses-dev \
        libreadline-dev libsqlite3-dev libssl-dev libzstd-dev \
        pkg-config unzip xz-utils zip zlib1g-dev zsh \
    && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

RUN curl --fail --show-error --location https://mise.run -o /tmp/install-mise.sh \
    && MISE_INSTALL_PATH=/usr/local/bin/mise sh /tmp/install-mise.sh \
    && rm /tmp/install-mise.sh \
    && useradd --create-home --shell /usr/bin/zsh dotfiles

USER dotfiles
ENV HOME=/home/dotfiles \
    LANG=en_US.UTF-8 \
    TERM=xterm-256color \
    MISE_YES=1 \
    MISE_TRUSTED_CONFIG_PATHS=/home/dotfiles/.config/mise
ENV PATH="/home/dotfiles/.local/bin:/home/dotfiles/.local/share/mise/shims:${PATH}"

WORKDIR /home/dotfiles/.config
COPY --chown=dotfiles:dotfiles . .

RUN mise install \
    && mise run setup:zsh \
    && git clone --depth 1 https://github.com/tmux-plugins/tpm.git "$HOME/.tmux/plugins/tpm" \
    && mkdir -p "$HOME/projects"

RUN pnpm --dir copilot install --frozen-lockfile --ignore-scripts \
    && pnpm --dir copilot build

WORKDIR /home/dotfiles
CMD ["sleep", "infinity"]
