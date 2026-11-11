return {
  { -- Autoformat
    'stevearc/conform.nvim',
    ft = { 'typescript', 'html', 'lua', 'javascript', 'css', 'scss' },
    opts = {
      notify_on_error = false,
      format_on_save = {
        timeout_ms = 3000,
        lsp_fallback = true,
      },
      formatters_by_ft = {
        lua = { 'stylua' },
        -- Conform can also run multiple formatters sequentially
        -- python = { "isort", "black" },
        --
        -- You can use a sub-list to tell conform to run *until* a formatter
        -- is found.
      },
    },
    config = function(_, opts)
      local cwd = vim.fn.getcwd() or ''
      local repos = { 'Cockpit', 'Hub', 'Cloudpilot', 'Datendrehscheibe-3rdParty', 'Datendrehscheibe' }
      local function path_matches_any_repo(path, repo_list)
        for _, repo in ipairs(repo_list) do
          if string.match(path, repo) then
            return true
          end
        end
        return false
      end
      if path_matches_any_repo(cwd, repos) then
        opts.formatters_by_ft = {
          javascript = { 'prettierd' },
          typescript = { 'prettierd' },
          html = { 'prettierd' },
        }
      end
      require('conform').setup(opts)
    end,
  },
}
-- vim: ts=2 sts=2 sw=2 et
