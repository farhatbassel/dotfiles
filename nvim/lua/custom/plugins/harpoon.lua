return {
  'theprimeagen/harpoon',
  config = function()
    Mark = require 'harpoon.mark'
    local ui = require 'harpoon.ui'

    vim.keymap.set('n', '<leader>a', Mark.add_file, { desc = 'Harpoon [A]dd' })
    vim.keymap.set('n', '<C-e>', ui.toggle_quick_menu)

    vim.keymap.set('n', '<M-h>', function()
      ui.nav_file(1)
    end, { desc = 'Harpoon toggle [1]' })
    vim.keymap.set('n', '<M-j>', function()
      ui.nav_file(2)
    end, { desc = 'Harpoon toggle [2]' })
    vim.keymap.set('n', '<M-k>', function()
      ui.nav_file(3)
    end, { desc = 'Harpoon toggle [3]' })
    vim.keymap.set('n', '<M-l>', function()
      ui.nav_file(4)
    end, { desc = 'Harpoon toggle [4]' })
    vim.keymap.set('n', '<M-;>', function()
      ui.nav_file(5)
    end, { desc = 'Harpoon toggle [5]' })
    vim.keymap.set('n', '<leader>6', function()
      ui.nav_file(6)
    end, { desc = 'Harpoon toggle [6]' })
  end,
}
