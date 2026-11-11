return {
  'olimorris/codecompanion.nvim',
  cmd = { 'CodeCompanion', 'CodeCompanionActions', 'CodeCompanionChat' },
  keys = {
    { '<C-a>', '<cmd>CodeCompanionActions<cr>', mode = { 'n', 'v' } },
    { '<LocalLeader>a', '<cmd>CodeCompanionChat Toggle<cr>', mode = { 'n', 'v' } },
    { 'ga', '<cmd>CodeCompanionChat Add<cr>', mode = 'v' },
  },
  dependencies = {
    'nvim-lua/plenary.nvim',
    'nvim-treesitter/nvim-treesitter',
  },
  config = function()
    require('codecompanion').setup {
      strategies = {
        chat = {
          keymaps = {
            close = {
              modes = {
                n = '<Nop>',
                i = '<Nop>',
              },
            },
          },
        },
      },
      interactions = {
        chat = {
          adapter = {
            name = 'copilot',
            model = 'claude-sonnet-4.6',
          },
        },
        keymaps = {
          close = false,
        },
      },
      opts = {
        log_level = 'TRACE', -- or "DEBUG"
      },
    }

    -- Expand 'cc' into 'CodeCompanion' in the command line
    vim.cmd [[cab cc CodeCompanion]]
  end,
}
