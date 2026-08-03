class HomeController {
  viewLandingPage(req, res) {
    return res.render("frontend/landing_page");
  }
}
module.exports = new HomeController();
