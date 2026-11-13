(function (root) {
  const roleNames = {
    owner: '负责人', editor: '编辑者', reader_copy: '只读（可复制）',
    reader_no_copy: '只读（不可复制）', blocked: '不可打开'
  };
  const permissions = {
    owner: ['open', 'copy', 'edit', 'members', 'delete'],
    editor: ['open', 'copy', 'edit'],
    reader_copy: ['open', 'copy'],
    reader_no_copy: ['open'],
    blocked: []
  };
  const can = (role, action) => Boolean(permissions[role]?.includes(action));
  const key = 'equation-billboard-project-drafts-v1';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let drafts = [];
  try { drafts = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(drafts)) drafts = []; } catch { drafts = []; }
  const save = () => localStorage.setItem(key, JSON.stringify(drafts));
  const dialog = document.createElement('dialog');
  dialog.className = 'project-dialog';
  dialog.setAttribute('aria-label', '项目与登录预览');
  document.body.append(dialog);
  let tab = 'projects', selected = null;
  function tabs() {
    return '<nav class="project-tabs" aria-label="项目界面"><button data-tab="projects" class="' + (tab === 'projects' ? 'active' : '') + '">项目</button><button data-tab="login" class="' + (tab === 'login' ? 'active' : '') + '">登录</button><button data-tab="roles" class="' + (tab === 'roles' ? 'active' : '') + '">权限</button></nav>';
  }
  function projectList() {
    if (selected) {
      const project = drafts.find(item => item.id === selected);
      if (!project) selected = null;
      else return '<button class="project-back" data-action="back">← 返回项目列表</button><h3>' + escapeHtml(project.name) + '</h3><p>' + escapeHtml(project.description || '暂无说明') + '</p><div class="project-preview-box"><b>项目工作区预览</b><p>公式、模块和成员数据将在共享数据服务接入后按项目加载。当前草稿没有独立公式库，也不构成访问授权。</p></div><h4>成员权限设置预览</h4><p>负责人可按邮箱邀请成员，并为每位成员选择下列五种项目权限。接入服务后，所有读取和写入都将由服务器校验。</p><div class="project-member-preview"><input type="email" placeholder="成员邮箱（服务接入后启用）" disabled><select disabled>' + Object.entries(roleNames).map(([value, label]) => '<option value="' + value + '">' + label + '</option>').join('') + '</select><button disabled>添加成员</button></div>';
    }
    return '<p class="project-hint">项目列表与新建表单现为本机预览。项目草稿只保存在当前浏览器，不会给其他人开通访问权限。</p><div class="project-list"><article><b>当前公式库</b><small>现有浏览器数据</small><p>继续使用现有公式公告牌。</p><button data-action="current">返回当前公式库</button></article>' + drafts.map(project => '<article><b>' + escapeHtml(project.name) + '</b><small>本机草稿 · 未同步</small><p>' + escapeHtml(project.description || '暂无说明') + '</p><button data-action="preview" data-id="' + escapeHtml(project.id) + '">查看工作区预览</button></article>').join('') + '</div><form id="project-draft-form" class="project-create"><h3>新建项目草稿</h3><label>项目名称<input name="name" maxlength="80" required placeholder="例如：海上算力中心模型"></label><label>项目说明<input name="description" maxlength="200" placeholder="可选"></label><button type="submit">＋ 新建项目草稿</button></form>';
  }
  function login() {
    return '<p class="project-hint">邮箱密码登录界面已准备。认证服务尚未接入，以下输入框不会收集或保存密码。</p><form class="project-login" aria-label="邮箱密码登录预览"><label>邮箱<input type="email" placeholder="name@example.com" disabled></label><label>密码<input type="password" placeholder="密码" disabled></label><button type="button" disabled>登录</button><p>忘记密码、邮箱验证和邀请注册将在认证服务接入后启用。</p></form>';
  }
  function roles() {
    const actions = [['open', '打开项目'], ['copy', '网页内复制'], ['edit', '编辑公式与目录'], ['members', '管理成员'], ['delete', '删除项目']];
    return '<p class="project-hint">这是后续服务器权限校验的规则草案。只读不可复制会关闭网页内复制功能，但无法防止截图或手动转录。</p><div class="project-table-wrap"><table class="project-role-table"><thead><tr><th>权限</th>' + actions.map(([, label]) => '<th>' + label + '</th>').join('') + '</tr></thead><tbody>' + Object.entries(roleNames).map(([role, label]) => '<tr><th>' + label + '</th>' + actions.map(([action]) => '<td>' + (can(role, action) ? '✓' : '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function render() {
    dialog.innerHTML = '<div class="project-dialog-head"><div><small>PROJECT ACCESS · PREVIEW</small><h2>项目与登录</h2></div><button class="project-close" type="button" aria-label="关闭">×</button></div>' + tabs() + '<div class="project-dialog-body">' + (tab === 'login' ? login() : tab === 'roles' ? roles() : projectList()) + '</div>';
    dialog.querySelector('.project-close').onclick = () => dialog.close();
    dialog.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { tab = button.dataset.tab; selected = null; render(); });
    dialog.querySelector('[data-action="current"]')?.addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-action="back"]')?.addEventListener('click', () => { selected = null; render(); });
    dialog.querySelectorAll('[data-action="preview"]').forEach(button => button.onclick = () => { selected = button.dataset.id; render(); });
    const form = dialog.querySelector('#project-draft-form');
    if (form) form.onsubmit = event => { event.preventDefault(); const name = form.elements.name.value.trim(); if (!name) return; drafts.push({ id: crypto.randomUUID(), name, description: form.elements.description.value.trim() }); save(); render(); };
  }
  document.querySelector('#project-open').onclick = () => { render(); dialog.showModal(); };
  root.ProjectRoles = { roleNames, permissions, can };
})(typeof window === 'undefined' ? globalThis : window);
