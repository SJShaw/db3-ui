function start() {
    $.ajax({
        method: 'get',
        url: "/api/v2.0/stats",
        dataType: 'json',
        contentType: 'application/json',
        processData: false,
        async: true,
        success: function (data, status, req) {
            showResults(data);
        },
        error: function (data, status, req) {
            //TODO show 'an error occurred'
            console.log("error in request", req);
        }
    });
}

function showResults(response) {
    var tableBody = $("#stats-cluster-count ul");
    tableBody.children().remove();
    response.clusters.forEach(kind => addTableRow(tableBody, kind));
    $("#total-regions").text(`${response.num_clusters}`);
    $("#most-clusters").text("").append(`<a href="show/genome/${response.top_secmet_assembly_id}">${response.top_secmet_species}</a>`);
    $("#top-taxon").text(`${response.top_secmet_taxon_count}`);
    $("#unique-strains").text(`${response.num_genomes}`);
    $("#unique-sequences").text(`${response.num_sequences}`);
    $("#most-sequenced").text("").append(`${response.top_seq_species}`);
    $("#top-taxon-count").text(`${response.top_seq_taxon_count}`);
}

function addTableRow(table, kind) {
    table.append(`    <li class="list-group-item col-md-6">
      <span class="badge ${kind.name}">${kind.count}</span>
      <a href="query.html?q=[type]${kind.name}">${kind.description}</a>
    </li>`)
}
