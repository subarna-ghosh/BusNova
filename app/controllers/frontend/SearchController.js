class SearchController {
  viewSearches(req, res) {
    return res.render("frontend/search_result");
  }
}
module.exports = new SearchController();
