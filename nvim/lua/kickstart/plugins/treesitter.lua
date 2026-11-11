return {
  { -- Highlight, edit, and navigate code
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    lazy = false,
    build = ':TSUpdate',
    config = function()
      local treesitter = require 'nvim-treesitter'
      treesitter.setup {}
      treesitter.install { 'bash', 'c', 'html', 'lua', 'markdown', 'markdown_inline', 'vim', 'vimdoc', 'graphql' }

      vim.api.nvim_create_autocmd('FileType', {
        group = vim.api.nvim_create_augroup('kickstart-treesitter', { clear = true }),
        callback = function(event)
          local lang = vim.treesitter.language.get_lang(vim.bo[event.buf].filetype)
          if not lang or not require('nvim-treesitter.parsers')[lang] then
            return
          end

          local function attach()
            if vim.api.nvim_buf_is_valid(event.buf) and vim.treesitter.language.get_lang(vim.bo[event.buf].filetype) == lang then
              vim.treesitter.start(event.buf, lang)
              vim.bo[event.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
            end
          end

          if vim.list_contains(treesitter.get_installed 'parsers', lang) then
            attach()
          else
            treesitter.install({ lang }):await(vim.schedule_wrap(function(err, success)
              if err or not success then
                vim.notify('Tree-sitter installation failed for ' .. lang .. ': ' .. tostring(err or 'see :TSLog'), vim.log.levels.ERROR)
                return
              end
              attach()
            end))
          end
        end,
      })
    end,
  },
}
-- vim: ts=2 sts=2 sw=2 et
