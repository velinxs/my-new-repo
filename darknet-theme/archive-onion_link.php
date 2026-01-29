<?php
/**
 * Template for displaying the Onion Link Directory
 */
get_header();

// Get all onion categories
$categories = get_terms(array(
    'taxonomy'   => 'onion_category',
    'hide_empty' => true,
));

// Get current filter
$current_category = isset($_GET['cat']) ? sanitize_text_field($_GET['cat']) : '';
$current_status = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';

// Count total links
$total_links = wp_count_posts('onion_link')->publish;
?>

<div class="onion-directory">
    <header class="directory-header">
        <h1>Onion Directory</h1>
        <p class="directory-stats">
            // <?php echo esc_html($total_links); ?> links indexed ::
            <?php echo esc_html(count($categories)); ?> categories ::
            Last updated: <?php echo date('Y-m-d'); ?>
        </p>
    </header>

    <!-- Category Filter -->
    <div class="directory-filter">
        <span class="filter-label">Filter by Category:</span>
        <div class="filter-links">
            <a href="<?php echo esc_url(get_post_type_archive_link('onion_link')); ?>"
               class="<?php echo empty($current_category) ? 'active' : ''; ?>">
                All
            </a>
            <?php foreach ($categories as $cat) : ?>
                <a href="<?php echo esc_url(add_query_arg('cat', $cat->slug)); ?>"
                   class="<?php echo $current_category === $cat->slug ? 'active' : ''; ?>">
                    <?php echo esc_html($cat->name); ?>
                    (<?php echo esc_html($cat->count); ?>)
                </a>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Status Filter -->
    <div class="directory-filter">
        <span class="filter-label">Filter by Status:</span>
        <div class="filter-links">
            <a href="<?php echo esc_url(remove_query_arg('status')); ?>"
               class="<?php echo empty($current_status) ? 'active' : ''; ?>">
                All
            </a>
            <a href="<?php echo esc_url(add_query_arg('status', 'online')); ?>"
               class="<?php echo $current_status === 'online' ? 'active' : ''; ?>">
                Online
            </a>
            <a href="<?php echo esc_url(add_query_arg('status', 'offline')); ?>"
               class="<?php echo $current_status === 'offline' ? 'active' : ''; ?>">
                Offline
            </a>
        </div>
    </div>

    <?php
    // Build query args
    $query_args = array(
        'post_type'      => 'onion_link',
        'posts_per_page' => 50,
        'orderby'        => 'title',
        'order'          => 'ASC',
        'paged'          => get_query_var('paged') ? get_query_var('paged') : 1,
    );

    if (!empty($current_category)) {
        $query_args['tax_query'] = array(
            array(
                'taxonomy' => 'onion_category',
                'field'    => 'slug',
                'terms'    => $current_category,
            ),
        );
    }

    if (!empty($current_status)) {
        $query_args['meta_query'] = array(
            array(
                'key'     => '_onion_status',
                'value'   => $current_status,
                'compare' => '=',
            ),
        );
    }

    $links_query = new WP_Query($query_args);
    ?>

    <?php if ($links_query->have_posts()) : ?>

        <?php if (!empty($current_category)) : ?>
            <?php
            $cat_term = get_term_by('slug', $current_category, 'onion_category');
            ?>
            <div class="onion-category">
                <h3 class="category-title"><?php echo esc_html($cat_term->name); ?></h3>
                <ul class="onion-links">
                    <?php while ($links_query->have_posts()) : $links_query->the_post(); ?>
                        <?php darknet_display_onion_link(); ?>
                    <?php endwhile; ?>
                </ul>
            </div>
        <?php else : ?>
            <!-- Display by category -->
            <?php foreach ($categories as $category) : ?>
                <?php
                $cat_links = new WP_Query(array(
                    'post_type'      => 'onion_link',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                    'tax_query'      => array(
                        array(
                            'taxonomy' => 'onion_category',
                            'field'    => 'term_id',
                            'terms'    => $category->term_id,
                        ),
                    ),
                    'meta_query'     => !empty($current_status) ? array(
                        array(
                            'key'     => '_onion_status',
                            'value'   => $current_status,
                            'compare' => '=',
                        ),
                    ) : array(),
                ));

                if ($cat_links->have_posts()) :
                ?>
                <div class="onion-category">
                    <h3 class="category-title">
                        <a href="<?php echo esc_url(add_query_arg('cat', $category->slug)); ?>">
                            <?php echo esc_html($category->name); ?>
                        </a>
                        <span class="text-muted">(<?php echo $cat_links->post_count; ?>)</span>
                    </h3>
                    <ul class="onion-links">
                        <?php while ($cat_links->have_posts()) : $cat_links->the_post(); ?>
                            <?php darknet_display_onion_link(); ?>
                        <?php endwhile; ?>
                    </ul>
                </div>
                <?php
                wp_reset_postdata();
                endif;
                ?>
            <?php endforeach; ?>

            <!-- Uncategorized links -->
            <?php
            $uncategorized = new WP_Query(array(
                'post_type'      => 'onion_link',
                'posts_per_page' => -1,
                'orderby'        => 'title',
                'order'          => 'ASC',
                'tax_query'      => array(
                    array(
                        'taxonomy' => 'onion_category',
                        'operator' => 'NOT EXISTS',
                    ),
                ),
            ));

            if ($uncategorized->have_posts()) :
            ?>
            <div class="onion-category">
                <h3 class="category-title">Uncategorized</h3>
                <ul class="onion-links">
                    <?php while ($uncategorized->have_posts()) : $uncategorized->the_post(); ?>
                        <?php darknet_display_onion_link(); ?>
                    <?php endwhile; ?>
                </ul>
            </div>
            <?php
            wp_reset_postdata();
            endif;
            ?>
        <?php endif; ?>

        <?php wp_reset_postdata(); ?>

        <nav class="pagination">
            <?php
            echo paginate_links(array(
                'total'     => $links_query->max_num_pages,
                'prev_text' => '&laquo; Prev',
                'next_text' => 'Next &raquo;',
            ));
            ?>
        </nav>

    <?php else : ?>

        <article class="post no-results">
            <header class="entry-header">
                <h2 class="entry-title">No Links Found</h2>
            </header>
            <div class="entry-content">
                <p>No onion links have been added to the directory yet.</p>
                <p>Check back later or <a href="<?php echo esc_url(home_url('/submit-link/')); ?>">submit a link</a>.</p>
            </div>
        </article>

    <?php endif; ?>
</div>

<?php get_footer(); ?>
