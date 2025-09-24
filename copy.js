refLinkBox.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a) {
    navigator.clipboard.writeText(a.href);
    // let the browser open the link naturally
  }
});
