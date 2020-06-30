var query = {'query': {'search': 'cluster', 'return_type': 'json', 'terms': {'term_type': 'expr', 'category': 'type', 'term': 'furan'}}}

var contigEdge = '<i class="fa fa-angle-double-left" title="Cluster on contig edge"></i><i class="fa fa-angle-double-right" title="Cluster on contig edge"></i>'

function showResults(response) {
    var tableBody = $("#results-table tbody");
    console.log("adding result to table", tableBody, response);
    tableBody.empty();
    response.clusters.forEach(region => addTableRow(tableBody, region));
    window.scrollTo(0,0);
    $(".result-counts").empty().append(buildCountsLine(response.total, response.offset, response.paginate));
    $(".results").show();
    if (response.total < response.offset + response.paginate) {
        $(".load_more").prop("disabled", true);
    } else {
        $(".load-more").prop("disabled", false).attr("data-start", response.offset + response.paginate);
    }
    if (!response.disable_stats) {
        updateCharts($(".chart-by-type"), "Regions by type", response.stats.clusters_by_type);
        updateCharts($(".chart-by-phylum"), "Regions by phylum", response.stats.clusters_by_phylum);
    }
}

function clearResults() {
    $("#results-table tbody").empty();
    $(".results").hide();
}

function toggleStats() {
    // TODO: fix initial show lag/skipping
    var toggle = $(".stats-toggle:visible");
    if ($(".chart:visible").length == 0) {
        toggle.text("Hide stats");
        $(".charts").slideDown(500);
    } else {
        toggle.text("Show stats");
        $(".charts").slideUp(500);
    }
}

function updateCharts(element, title, chartData) {
    new Chart(element, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: '',
                data: chartData.data,
                backgroundColor: [
                ],
                borderColor: [
                ],
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: title
            },
            scales: {
              xAxes: [{ ticks: {autoSkip: false} }],
              yAxes: [{ ticks: {min: 0} }]
            },
            legend: {
                display: false,
            }
        }
    });
}

function buildCountsLine(total, start, blockSize) {
    // start is assumed to be 0-indexed
    var size = start + blockSize + 1 > total ? total - start + 1 : blockSize;
    return `Your search gave <strong>${total}</strong> result${total > 1 ? "s" : ""} in total. Showing <strong>${start + 1}</strong> to <strong>${start + size}</strong>`;
}

function addTableRow(table, region) {
    var similarity = "";
    var link = "";
    var mibigDescription = "";
    if (region.similarity !== null) {
        var underscore = region.cbh_acc.indexOf('_');
        var trimmedAccession = region.cbh_acc.substring(0, underscore != -1 ? underscore : region.cbh_acc.length);
        var level = "high"; //TODO other cutoffs
        similarity = `<span class="similarity-${level}">${region.similarity} %</span>`
        link = `<a class="link-external" target="_blank" href="https://mibig.secondarymetabolites.org/repository/${trimmedAccession}/index.html">${trimmedAccession}</a>`;
        mibigDescription = `<span>${region.cbh_description}</span>`;
    }

    table.append(`
      <tr class="cluster-list" onClick="window.open('/output/${region.assembly_id}/index.html#r${region.record_number}c${region.region_number}', '_blank')">
        <td><a class="link-external" target="_blank" href="https://www.ncbi.nlm.nih.gov/genome/?term=${region.acc}">${region.genus} ${region.species} ${region.strain}</a></td>
        <td>${region.acc}</td>
        <td class="cluster-type"><span class="badge ${region.term}">${region.region_number}</span></td>
        <td class="">${region.description}</td>
        <td class="digits">${region.start_pos}</td>
        <td class="digits">${region.end_pos}</td>
        <td>${region.contig_edge ? contigEdge : ""}</td>
        <td>${mibigDescription}</td>
        <td class="digits">${similarity}</td>
        <td>${link}</td>
      </tr>`);
}
