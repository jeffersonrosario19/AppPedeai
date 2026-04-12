function toggleMenu() {
  if (!isAuthenticated()) {
    return;
  }

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const isDesktop = window.matchMedia("(min-width: 769px)").matches;

  if (isDesktop) {
    document.body.classList.toggle("desktop-collapsed");
    return;
  }

  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

function closeMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  sidebar.classList.remove("active");
  overlay.classList.remove("active");
}

function toggleSubmenu() {
  const submenu = document.getElementById("submenuConfig");
  const arrow = document.getElementById("arrow");

  submenu.classList.toggle("open");
  arrow.style.transform = submenu.classList.contains("open")
    ? "rotate(180deg)"
    : "rotate(0deg)";
}

function setActive(element) {
  document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
  element.classList.add("active");
}

function activateMenuByPage(page) {
  const pageMap = {
    atendimento: 0,
    cardapio: 1,
    historico: 2,
    mesas: 3
  };

  const items = document.querySelectorAll(".menu-item");
  items.forEach((item) => item.classList.remove("active"));

  if (pageMap[page] !== undefined && items[pageMap[page]]) {
    items[pageMap[page]].classList.add("active");
  }
}
