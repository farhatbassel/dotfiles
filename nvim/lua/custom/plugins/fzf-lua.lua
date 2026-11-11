return {
  'ibhagwan/fzf-lua',
  dependencies = { 'nvim-tree/nvim-web-devicons' },
  config = function()
    if not vim.g.fzf_lua_server then
      vim.g.fzf_lua_server = vim.fn.serverstart(
        vim.fn.stdpath('run') .. '/fzf-lua-' .. vim.fn.getpid()
      )
    end

    local builtin = require 'fzf-lua'
    local actions = require 'fzf-lua.actions'

    builtin.setup {
      keymap = {
        fzf = {
          ['ctrl-a'] = 'toggle-all',
        },
      },
      actions = {
        files = {
          ['default'] = actions.file_edit,
          ['ctrl-q'] = actions.file_sel_to_qf,
        },
        grep = {
          ['default'] = actions.file_edit_or_qf,
        },
      },
    }

    vim.keymap.set('n', '<leader>sh', builtin.help_tags, { desc = '[S]earch [H]elp' })
    vim.keymap.set('n', '<leader>sk', builtin.keymaps, { desc = '[S]earch [K]eymaps' })
    vim.keymap.set('n', '<leader>sf', builtin.files, { desc = '[S]earch [F]iles' })
    vim.keymap.set('n', '<leader>ss', builtin.builtin, { desc = '[S]earch [S]elect Telescope' })
    vim.keymap.set('n', '<leader>sw', builtin.grep_cword, { desc = '[S]earch current [W]ord' })
    vim.keymap.set('n', '<leader>sg', builtin.live_grep, { desc = '[S]earch by [G]rep' })
    vim.keymap.set('n', '<leader>sj', builtin.jumps, { desc = '[S]earch [J]umps' })
    vim.keymap.set('n', '<leader>sd', builtin.diagnostics_workspace, { desc = '[S]earch [D]iagnostics' })
    vim.keymap.set('n', '<leader>sr', builtin.resume, { desc = '[S]earch [R]esume' })
    vim.keymap.set('n', '<leader>s.', builtin.oldfiles, { desc = '[S]earch Recent Files ("." for repeat)' })
    vim.keymap.set('n', '<leader><leader>', builtin.buffers, { desc = '[ ] Find existing buffers' })
    vim.keymap.set('n', '<leader>sp', builtin.profiles, { desc = '[S]earch [P]rofiles' })
    vim.keymap.set('n', '<leader>sq', builtin.quickfix, { desc = '[S]earch [Q]uickfix' })
    -- Slightly advanced example of overriding default behavior and theme
    vim.keymap.set('n', '<leader>/', function()
      builtin.lgrep_curbuf()
    end, { desc = '[/] Fuzzily search in current buffer' })

    -- Shortcut for searching your neovim configuration files
    vim.keymap.set('n', '<leader>sn', function()
      builtin.files { cwd = vim.fn.stdpath 'config' }
    end, { desc = '[S]earch [N]eovim files' })

    vim.keymap.set('n', '<leader>se', function()
      builtin.files {
        cmd = "rg --files -g '.env'",
        rg_opts = [[--color=never --files -g]],
      }
    end, { desc = '[S]earch [F]iles' })
  end,
}
